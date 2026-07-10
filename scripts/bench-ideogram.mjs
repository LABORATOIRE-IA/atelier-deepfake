/*
 * BENCH ISOLÉ — Ideogram V3 Character vs stack actuelle (fal-ai/face-swap).
 * HORS de l'app, aucun câblage. Lancer :
 *   NODE_OPTIONS=--use-system-ca node scripts/bench-ideogram.mjs
 * (poste corporate avec CA custom → sans le préfixe, erreur TLS
 *  "unable to get local issuer certificate", cf. CLAUDE.md)
 *
 * ── Modèle fal utilisé (vérifié dans la doc, non deviné) ───────────────
 *   Endpoint : "fal-ai/ideogram/character"
 *   Doc      : https://fal.ai/models/fal-ai/ideogram/character/api
 *   Approche : GÉNÉRATION d'une scène autour d'un visage de référence
 *              (vs swap dans une photo existante pour fal-ai/face-swap).
 *
 * ── Format d'ENTRÉE ────────────────────────────────────────────────────
 *   prompt               : description de la scène à générer (requis)
 *   reference_image_urls : liste d'URLs de référence du personnage —
 *                          ⚠️ 1 seule image supportée à ce jour (requis)
 *   rendering_speed      : TURBO | BALANCED | QUALITY (défaut BALANCED)
 *   style                : AUTO | REALISTIC | FICTION → REALISTIC ici
 *
 * ── Format de SORTIE ──────────────────────────────────────────────────
 *   { images: [{ url, content_type?, file_name?, file_size? }], seed }
 *   (pas de width/height garantis, contrairement à fal-ai/face-swap)
 *
 * ── Protocole du bench ────────────────────────────────────────────────
 *   2 références (frontale + trois-quarts, notre cas de douleur)
 *   × 4 scènes "quotidien" = 8 appels séquentiels (latences propres).
 *   Entrées  : scripts/bench-input/moi.jpg + moi-34.jpg (fournies à la main)
 *   Sorties  : scripts/bench-output/ideogram-<ref>-<scene>.jpg
 *   Un échec/timeout logge l'erreur et NE stoppe PAS le run.
 *
 * ── Coût ──────────────────────────────────────────────────────────────
 *   Non affiché sur la page fal ni garanti dans la réponse ; on logge ce
 *   que l'API renvoie le cas échéant, sinon → dashboard fal (Billing).
 *
 * ── Clé API ───────────────────────────────────────────────────────────
 *   Lue depuis .env.local (FAL_KEY=...), JAMAIS en dur, jamais committée.
 */

import { readFile, writeFile, access, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fal } from "@fal-ai/client";

const MODEL = "fal-ai/ideogram/character";
const TIMEOUT_MS = 120_000; // même marge que la route (latence fal très variable)

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const INPUT_DIR = join(here, "bench-input");
const OUTPUT_DIR = join(here, "bench-output");

// Références : frontale + trois-quarts (le cas où fal-ai/face-swap décroche)
const REFS = [
  { id: "moi", file: join(INPUT_DIR, "moi.jpg"), label: "frontale" },
  { id: "moi-34", file: join(INPUT_DIR, "moi-34.jpg"), label: "trois-quarts" },
];

// Scènes "quotidien" — id court pour les noms de fichiers de sortie
const SCENES = [
  {
    id: "team-office",
    prompt:
      "professional team photo in a modern open-space office, group of colleagues smiling at camera",
  },
  {
    id: "badge",
    prompt: "employee ID badge photo, corporate headshot, neutral background",
  },
  {
    id: "event",
    prompt:
      "candid photo with colleagues at a company event, indoor lighting",
  },
  {
    id: "family",
    prompt: "family photo in a living room, casual setting, natural light",
  },
];

// 1) Clé depuis .env.local (jamais en dur)
try {
  process.loadEnvFile(join(root, ".env.local"));
} catch {
  /* .env.local absent → on vérifie FAL_KEY juste après */
}
const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error(
    "❌ FAL_KEY introuvable. Crée un fichier .env.local à la racine avec :\n" +
      "   FAL_KEY=ta_cle_fal\n",
  );
  process.exit(1);
}
// Même fix que la route : TOUTES les requêtes du client fal (upload + polling
// de statut de fal.subscribe) passent par un fetch "no-store".
const noStoreFetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
fal.config({ credentials: FAL_KEY, fetch: noStoreFetch });

// 2) Références présentes ? On continue avec celles qui existent.
const refs = [];
for (const ref of REFS) {
  try {
    await access(ref.file);
    refs.push(ref);
  } catch {
    console.warn(`⚠️  Référence absente, ignorée : ${ref.file} (${ref.label})`);
  }
}
if (refs.length === 0) {
  console.error(
    `❌ Aucune image de référence. Dépose moi.jpg (frontale) et moi-34.jpg\n` +
      `   (trois-quarts) dans ${INPUT_DIR}`,
  );
  process.exit(1);
}
await mkdir(OUTPUT_DIR, { recursive: true });

// 3) Upload des références → URLs (l'API attend des URLs)
console.log("⏫  Upload des références vers fal.storage…");
for (const ref of refs) {
  const buf = await readFile(ref.file);
  const file = new File([buf], `${ref.id}.jpg`, { type: "image/jpeg" });
  ref.url = await fal.storage.upload(file);
  console.log(`   ${ref.id} (${ref.label}) : ${ref.url}`);
}

function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// 4) 8 appels séquentiels (latences non parasitées par la concurrence)
const rows = [];
for (const ref of refs) {
  for (const scene of SCENES) {
    const name = `ideogram-${ref.id}-${scene.id}.jpg`;
    const out = join(OUTPUT_DIR, name);
    console.log(`\n🚀  ${MODEL} — réf ${ref.id} (${ref.label}) × scène ${scene.id}`);
    const t0 = performance.now();
    try {
      const result = await withTimeout(
        fal.subscribe(MODEL, {
          input: {
            prompt: scene.prompt,
            reference_image_urls: [ref.url],
            style: "REALISTIC",
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS") {
              (update.logs ?? []).forEach((l) => l?.message && console.log("   ·", l.message));
            }
          },
        }),
        TIMEOUT_MS,
      );
      const latencyMs = Math.round(performance.now() - t0);

      const image = result?.data?.images?.[0];
      if (!image?.url) {
        console.error("   ❌ réponse sans image :", JSON.stringify(result?.data ?? result));
        rows.push({ ref: ref.id, scene: scene.id, status: "sans image", latencyMs, file: "—" });
        continue;
      }
      const resp = await fetch(image.url, { cache: "no-store" });
      await writeFile(out, Buffer.from(await resp.arrayBuffer()));

      console.log(`   ✅ ${latencyMs} ms → ${out}`);
      console.log("   request_id :", result.requestId, "· seed :", result.data?.seed ?? "?");
      // Coût : pas de champ documenté ; on logge si l'API renvoie quelque chose.
      const cost = result.data?.cost ?? result.data?.billing ?? result.data?.credits;
      console.log(
        "   💳 coût    :",
        cost !== undefined ? JSON.stringify(cost) : "non renvoyé par l'API — voir dashboard fal (Billing)",
      );
      if (result.data?.timings) console.log("   timings    :", JSON.stringify(result.data.timings));
      rows.push({ ref: ref.id, scene: scene.id, status: "OK", latencyMs, file: out });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - t0);
      const label = err instanceof Error && err.message === "timeout" ? "timeout (120 s)" : String(err?.message ?? err);
      console.error(`   ❌ échec (${latencyMs} ms) : ${label}`);
      // Le corps d'erreur fal (ValidationError…) est dans err.body quand dispo
      if (err?.body) console.error("   détail :", JSON.stringify(err.body));
      rows.push({ ref: ref.id, scene: scene.id, status: `échec : ${label}`, latencyMs, file: "—" });
    }
  }
}

// 5) Récap — je juge la ressemblance à l'œil sur les fichiers listés
console.log("\n═══ RÉCAP ═══");
console.table(
  rows.map((r) => ({
    référence: r.ref,
    scène: r.scene,
    statut: r.status,
    "latence (ms)": r.latencyMs,
    fichier: r.file,
  })),
);
const ok = rows.filter((r) => r.status === "OK").length;
console.log(`${ok}/${rows.length} générations OK · sorties dans ${OUTPUT_DIR}`);
