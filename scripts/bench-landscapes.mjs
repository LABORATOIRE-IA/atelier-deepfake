/*
 * BENCH ISOLÉ — Paysages FAKE pour le thème quiz « Paysages » (P2 contenu).
 * HORS de l'app, aucun câblage. Lancer :
 *   NODE_OPTIONS=--use-system-ca node scripts/bench-landscapes.mjs
 *
 * ── Modèle fal utilisé (validé ensemble, licence commerciale) ──────────
 *   Endpoint : "fal-ai/flux-pro/v1.1-ultra"  (FLUX 1.1 [pro] ultra, BFL)
 *   Doc      : https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api
 *   raw: true → rendu « photo naturelle, moins traitée » : le FAKE du quiz
 *   doit ressembler à une photo d'appareil, pas à un rendu IA léché.
 *
 * ── Protocole ──────────────────────────────────────────────────────────
 *   8 prompts photoréalistes SANS humain ni texte lisible, MIX DE REGISTRES
 *   pour que le style ne trahisse pas le FAKE (pas triable au « trop beau ») :
 *   3 amateur (smartphone, ciel couvert) · 3 neutre (documentaire) ·
 *   2 spectaculaire (lumière travaillée). Géographies variées.
 *   Appels séquentiels (latences propres), timeout 100 s par appel.
 *   Sorties : scripts/bench-output/landscape-<id>.jpg
 *   On choisit les 5 meilleures ensemble ; fiches rédigées d'après image.
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

// id = slug du lieu → landscape-<id>.jpg
const LANDSCAPES = [
  // — registre AMATEUR (smartphone, cadrage banal, ciel couvert) —
  {
    id: "rue-europeenne",
    prompt:
      "quiet residential street in a small European town, old facades with shutters, a few parked cars, amateur photo, slightly overcast, casual framing, smartphone camera",
  },
  {
    id: "campagne-vallonnee",
    prompt:
      "rolling green countryside with hedgerows and a dirt path, amateur photo, slightly overcast, casual framing, smartphone camera",
  },
  {
    id: "lac-montagne",
    prompt:
      "mountain lake with a pebble shore and pine trees, amateur snapshot, slightly overcast, casual framing, smartphone camera",
  },
  // — registre NEUTRE (photo documentaire simple) —
  {
    id: "foret-brumeuse",
    prompt:
      "misty coniferous forest in the early morning, documentary photography, natural muted colors, eye-level framing",
  },
  {
    id: "cote-mediterraneenne",
    prompt:
      "mediterranean coastline with rocky coves and dry scrubland, simple documentary photo, midday natural light",
  },
  {
    id: "desert",
    prompt:
      "arid desert landscape with sand dunes and sparse dry vegetation, documentary photography, natural colors, clear sky",
  },
  // — registre SPECTACULAIRE (lumière travaillée) —
  {
    id: "montagne-alpine",
    prompt:
      "alpine mountain range at sunrise, golden light on snowy peaks, valley in shadow, professional landscape photography",
  },
  {
    id: "falaises-oceanes",
    prompt:
      "tall ocean cliffs at golden hour, waves breaking below, dramatic warm light, professional landscape photography",
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
for (const { id, prompt } of LANDSCAPES) {
  const out = join(OUTPUT_DIR, `landscape-${id}.jpg`);
  console.log(`\n🚀  ${MODEL} — ${id}`);
  const t0 = performance.now();
  try {
    const result = await withTimeout(
      fal.subscribe(MODEL, {
        input: {
          prompt,
          raw: true, // rendu photo naturelle (validé)
          aspect_ratio: "16:9",
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
