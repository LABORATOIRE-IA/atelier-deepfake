/*
 * Test ISOLÉ de la route /api/faceswap migrée Ideogram — HORS de l'app.
 * Prérequis : dev server lancé (npm run dev, port 3002) + FAL_KEY en .env.local.
 * Lancer :  node scripts/test-ideogram-route.mjs
 * (pas besoin de --use-system-ca ici : c'est le SERVEUR qui parle à fal,
 *  et le script dev embarque déjà NODE_OPTIONS=--use-system-ca)
 *
 * Fait : lit une photo locale (bench-input/moi.jpg, sinon test/source.jpg),
 * la POST en dataURL sur http://localhost:3002/api/faceswap, affiche le
 * statut, le nombre de scènes réussies et les URLs. Les latences PAR SCÈNE
 * sont loggées côté serveur ([faceswap] <scene> OK en <n> ms).
 */

import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROUTE = "http://localhost:3002/api/faceswap";

const here = dirname(fileURLToPath(import.meta.url));
const CANDIDATES = [
  join(here, "bench-input", "moi.jpg"),
  join(here, "test", "source.jpg"),
];

let photoPath = null;
for (const p of CANDIDATES) {
  try {
    await access(p);
    photoPath = p;
    break;
  } catch {
    /* candidat suivant */
  }
}
if (!photoPath) {
  console.error(`❌ Aucune photo de test trouvée parmi :\n   ${CANDIDATES.join("\n   ")}`);
  process.exit(1);
}

const buf = await readFile(photoPath);
const photo = `data:image/jpeg;base64,${buf.toString("base64")}`;
console.log(`📷  Photo : ${photoPath} (${Math.round(buf.length / 1024)} ko)`);
console.log(`🚀  POST ${ROUTE} …`);

const t0 = performance.now();
let res;
try {
  res = await fetch(ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photo }),
  });
} catch (err) {
  console.error(`❌ Serveur injoignable (${err?.message}). Dev server lancé sur 3002 ?`);
  process.exit(1);
}
const latencyMs = Math.round(performance.now() - t0);
const data = await res.json().catch(() => ({}));

console.log(`\n⏱  latence totale : ${latencyMs} ms · HTTP ${res.status}`);
if (!res.ok) {
  console.error("❌ Échec :", JSON.stringify(data, null, 2));
  process.exit(1);
}

const results = data?.results ?? [];
console.log(`✅  ${results.length}/4 scènes réussies`);
console.table(
  results.map((r) => ({ scène: r.scene, label: r.label, url: r.url.slice(0, 80) + "…" })),
);
console.log("ℹ️  Latences par scène : voir la console du dev server ([faceswap] <scene> OK en <n> ms).");
