/*
 * BENCH ISOLÉ — Visages FAKE pour le thème quiz « Visages » (SWAP étape 1).
 * HORS de l'app, aucun câblage. Lancer :
 *   NODE_OPTIONS=--use-system-ca node scripts/bench-portraits.mjs
 *
 * ── But ────────────────────────────────────────────────────────────────
 *   Remplacer les 5 fiches FAKE « Visages » (avatars basse-déf hérités du
 *   dataset OpenFake) par de vrais visages 100 % synthétiques photoréalistes.
 *   On génère 8 portraits, on choisira les 5 meilleurs ensemble (étape 2).
 *
 * ── Cadre éthique (CLAUDE.md) ──────────────────────────────────────────
 *   Un FAKE = une personne QUI N'EXISTE PAS (visage entièrement généré),
 *   jamais la photo d'une personne réelle. Prompts = personnes GÉNÉRIQUES
 *   inventées, AUCUN nom de célébrité, aucune identité réelle.
 *
 * ── Modèle fal utilisé (même que bench-landscapes, licence commerciale) ─
 *   Endpoint : "fal-ai/flux-pro/v1.1-ultra"  (FLUX 1.1 [pro] ultra, BFL)
 *   Doc      : https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api
 *   raw: true → rendu « photo naturelle, moins traitée » : le FAKE doit
 *   ressembler à une photo d'appareil, pas à un portrait studio léché.
 *   aspect_ratio "3:4" (portrait) — valeur validée dans la doc de l'endpoint
 *   (accepte 21:9,16:9,4:3,3:2,1:1,2:3,3:4,9:16,9:21).
 *
 * ── Protocole ──────────────────────────────────────────────────────────
 *   8 portraits photoréalistes VARIÉS (âges, genres, origines, cadrages)
 *   pour refléter un public showroom, registre « photo naturelle ».
 *   UNE personne par image, regard caméra ou léger 3/4.
 *   Appels séquentiels (latences propres), timeout 100 s par appel.
 *   Sorties : scripts/bench-output/portrait-<id>.jpg
 *
 * ── Clé API ────────────────────────────────────────────────────────────
 *   FAL_KEY lue depuis .env.local, jamais en dur, jamais committée.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fal } from "@fal-ai/client";

const MODEL = "fal-ai/flux-pro/v1.1-ultra";
const TIMEOUT_MS = 100_000;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const OUTPUT_DIR = join(here, "bench-output");

// id = slug court (genre-âge) → portrait-<id>.jpg
// Origines variées = personnes GÉNÉRIQUES inventées (public showroom divers),
// aucune identité réelle.
const PORTRAITS = [
  {
    id: "femme-30",
    prompt:
      "candid portrait photograph of a 30-year-old Southern European woman, natural indoor window light, waist-up framing, looking at the camera, photorealistic, natural skin texture, everyday casual photo, not studio",
  },
  {
    id: "homme-50",
    prompt:
      "candid portrait photograph of a 50-year-old West African man outdoors, gentle backlight at the end of the day, slight three-quarter view, photorealistic, natural skin texture, everyday casual photo, not studio",
  },
  {
    id: "femme-60",
    prompt:
      "candid portrait photograph of a 60-year-old East Asian woman in an open-plan office, soft natural light, waist-up framing, looking at the camera, photorealistic, natural skin texture, everyday casual photo, not studio",
  },
  {
    id: "homme-25",
    prompt:
      "candid portrait photograph of a 25-year-old Northern European man, neutral even lighting, plain wall background, looking at the camera, photorealistic, natural skin texture, everyday casual photo, not studio",
  },
  {
    id: "femme-40",
    prompt:
      "candid close-up portrait photograph of a 40-year-old South Asian woman, tight framing on the face, natural daylight, slight three-quarter view, photorealistic, natural skin texture with visible pores, everyday casual photo, not studio",
  },
  {
    id: "homme-35",
    prompt:
      "candid portrait photograph of a 35-year-old Middle Eastern man next to a window, soft window light, waist-up framing, looking at the camera, photorealistic, natural skin texture, everyday casual photo, not studio",
  },
  {
    id: "femme-20",
    prompt:
      "candid portrait photograph of a 20-year-old Latin American woman outdoors, blurred urban street background, natural daylight, looking at the camera, photorealistic, natural skin texture, everyday casual photo, not studio",
  },
  {
    id: "homme-45",
    prompt:
      "candid portrait photograph of a 45-year-old North African man, casual clothing, indoor home setting, natural light, slight three-quarter view, photorealistic, natural skin texture, everyday casual photo, not studio",
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
  console.error("❌ FAL_KEY introuvable dans .env.local");
  process.exit(1);
}
// Même fix que la route : toutes les requêtes fal en no-store.
const noStoreFetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
fal.config({ credentials: FAL_KEY, fetch: noStoreFetch });

await mkdir(OUTPUT_DIR, { recursive: true });

function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// 2) 8 générations séquentielles (latences non parasitées)
const rows = [];
for (const { id, prompt } of PORTRAITS) {
  const out = join(OUTPUT_DIR, `portrait-${id}.jpg`);
  console.log(`\n🚀  ${MODEL} — ${id}`);
  const t0 = performance.now();
  try {
    const result = await withTimeout(
      fal.subscribe(MODEL, {
        input: {
          prompt,
          raw: true, // rendu photo naturelle (validé)
          aspect_ratio: "3:4", // portrait
          output_format: "jpeg",
        },
      }),
      TIMEOUT_MS,
    );
    const latencyMs = Math.round(performance.now() - t0);
    const image = result?.data?.images?.[0];
    if (!image?.url) {
      console.error("   ❌ réponse sans image :", JSON.stringify(result?.data ?? result));
      rows.push({ id, statut: "sans image", "latence (ms)": latencyMs, fichier: "—" });
      continue;
    }
    const resp = await fetch(image.url, { cache: "no-store" });
    await writeFile(out, Buffer.from(await resp.arrayBuffer()));
    console.log(`   ✅ ${latencyMs} ms → ${out} (${image.width ?? "?"}×${image.height ?? "?"})`);
    rows.push({ id, statut: "OK", "latence (ms)": latencyMs, fichier: out });
  } catch (err) {
    const latencyMs = Math.round(performance.now() - t0);
    const label = err instanceof Error && err.message === "timeout" ? "timeout (100 s)" : String(err?.message ?? err);
    console.error(`   ❌ échec (${latencyMs} ms) : ${label}`);
    if (err?.body) console.error("   détail :", JSON.stringify(err.body));
    rows.push({ id, statut: `échec : ${label}`, "latence (ms)": latencyMs, fichier: "—" });
  }
}

// 3) Récap
console.log("\n═══ RÉCAP ═══");
console.table(rows);
console.log(`${rows.filter((r) => r.statut === "OK").length}/${rows.length} générations OK · sorties dans ${OUTPUT_DIR}`);
