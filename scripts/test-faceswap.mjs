/*
 * Test ISOLÉ de l'API face-swap fal.ai — HORS de l'app, aucun câblage.
 * Lancer :  NODE_OPTIONS=--use-system-ca node scripts/test-faceswap.mjs
 *
 * ── Modèle fal utilisé (vérifié dans la doc, non deviné) ───────────────
 *   Endpoint : "fal-ai/face-swap"   (catégorie image-to-image, "Swap Face")
 *   Doc      : https://fal.ai/models/fal-ai/face-swap/api
 *   ⚠️ NB : "easel-ai/advanced-face-swap" est DÉPRÉCIÉ ("no longer supported")
 *           → on utilise "fal-ai/face-swap", qui est l'endpoint actuel.
 *
 * ── Format d'ENTRÉE (les 2 champs sont des URLs, requis) ───────────────
 *   swap_image_url : URL de l'image contenant LE VISAGE à utiliser   → source.jpg
 *   base_image_url : URL de l'image/scène CIBLE où coller le visage   → target.jpg
 *   (accepte image / gif / video ; ici 2 .jpg locales uploadées via fal.storage)
 *
 * ── Format de SORTIE ──────────────────────────────────────────────────
 *   { image: { url, width, height, content_type, file_name, file_size } }
 *
 * ── Coût ──────────────────────────────────────────────────────────────
 *   Le coût n'est PAS renvoyé dans la réponse de l'API. À vérifier sur le
 *   dashboard fal (Billing/Usage). On logge les métriques/timings dispo.
 *
 * ── Réseau d'entreprise (CA custom) ───────────────────────────────────
 *   Si erreur TLS ("unable to get local issuer certificate"), préfixer par
 *   NODE_OPTIONS=--use-system-ca (lit le trousseau système). Cf. CLAUDE.md.
 *
 * ── Clé API ───────────────────────────────────────────────────────────
 *   Lue depuis .env.local (FAL_KEY=...), JAMAIS en dur, jamais committée.
 */

import { readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fal } from "@fal-ai/client";

const MODEL = "fal-ai/face-swap";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const TEST_DIR = join(here, "test");
const SOURCE = join(TEST_DIR, "source.jpg"); // le VISAGE
const TARGET = join(TEST_DIR, "target.jpg"); // la SCÈNE cible
const RESULT = join(TEST_DIR, "result.jpg");

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
fal.config({ credentials: FAL_KEY });

// 2) Vérifie la présence des 2 images d'entrée
async function mustExist(path, label) {
  try {
    await access(path);
  } catch {
    console.error(`❌ Image manquante : ${label}\n   Attendu : ${path}`);
    process.exit(1);
  }
}
await mustExist(SOURCE, "source.jpg (le visage)");
await mustExist(TARGET, "target.jpg (la scène cible)");

// 3) Upload des fichiers locaux → URLs (l'API attend des URLs)
async function uploadLocal(path, name) {
  const buf = await readFile(path);
  const file = new File([buf], name, { type: "image/jpeg" });
  return fal.storage.upload(file);
}

console.log("⏫  Upload des images vers fal.storage…");
const [swapUrl, baseUrl] = await Promise.all([
  uploadLocal(SOURCE, "source.jpg"),
  uploadLocal(TARGET, "target.jpg"),
]);
console.log("   visage (swap_image_url) :", swapUrl);
console.log("   scène  (base_image_url) :", baseUrl);

// 4) Appel du modèle + mesure de latence
console.log(`\n🚀  Appel ${MODEL}…`);
const t0 = performance.now();
const result = await fal.subscribe(MODEL, {
  input: {
    swap_image_url: swapUrl, // le visage à utiliser (source.jpg)
    base_image_url: baseUrl, // la scène cible (target.jpg)
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      (update.logs ?? []).forEach((l) => l?.message && console.log("   ·", l.message));
    }
  },
});
const latencyMs = Math.round(performance.now() - t0);

// 5) Résultat + sauvegarde locale
const image = result?.data?.image;
if (!image?.url) {
  console.error("❌ Réponse inattendue (pas d'image) :", JSON.stringify(result, null, 2));
  process.exit(1);
}

const resp = await fetch(image.url);
await writeFile(RESULT, Buffer.from(await resp.arrayBuffer()));

console.log("\n✅  Terminé");
console.log("   request_id   :", result.requestId);
console.log("   image URL    :", image.url);
console.log("   dimensions   :", `${image.width ?? "?"}×${image.height ?? "?"}`, image.content_type ?? "");
console.log("   sauvegardé   :", RESULT);
console.log("   ⏱ latence    :", latencyMs, "ms");
// Coût/crédits : non renseigné dans la réponse API → voir dashboard fal.
console.log("   💳 coût      : non renvoyé par l'API — voir dashboard fal (Billing)");
if (result.data?.timings) console.log("   timings      :", JSON.stringify(result.data.timings));
