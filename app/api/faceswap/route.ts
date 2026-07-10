import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { scenes } from "@/lib/content";

/*
 * POST /api/faceswap — appel fal.ai CÔTÉ SERVEUR (migration Ideogram).
 *
 * SÉCURITÉ : FAL_KEY est lue depuis l'env serveur et n'est JAMAIS exposée au
 * navigateur. Le client n'envoie QUE la photo (dataURL) ; les prompts de
 * scène sont résolus ici depuis la whitelist `scenes` — le client ne peut
 * jamais injecter de prompt (même logique anti-abus que l'ancienne whitelist
 * de fichiers cibles).
 *
 * Entrée (JSON) : { photo: dataURL }
 * Modèle : fal-ai/ideogram/character — GÉNÈRE une scène autour du visage de
 * référence (vs swap dans une image existante avant la migration).
 *   - reference_image_urls = [photo du visiteur]  (1 seule réf. supportée)
 *   - prompt               = scene.prompt (whitelist serveur)
 *   - style REALISTIC      = évite le rendu illustration du mode AUTO
 * Les 4 scènes sont générées EN PARALLÈLE (Promise.allSettled), timeout
 * INDIVIDUEL par appel — latence totale ≈ 1 appel, pas 4×.
 *
 * Réponses :
 *   200 { results: [{ scene, label, url }] }  ≥ 1 scène réussie (succès seuls,
 *                                             échecs partiels loggés serveur)
 *   400 { error, message }                    photo invalide
 *   500 { error, message }                    FAL_KEY absente côté serveur
 *   502 { error:"fal_error", ... }            0 scène réussie
 *   504 { error:"generation_timeout" }        0 réussie ET tous les échecs
 *                                             sont des timeouts
 */

export const runtime = "nodejs"; // fs/Buffer + SDK fal → runtime Node
// maxDuration > timeout par appel : notre JSON d'erreur revient AVANT que la
// plateforme ne tue la fonction (sinon 504 brut sans corps). Projet sur une
// ÉQUIPE Vercel (= Pro+, limite 300 s) → 130 s OK en prod.
export const maxDuration = 130;
// Empêche Next de cacher/mémoïser les requêtes de cette route (sinon le polling
// de statut de fal.subscribe voit une réponse figée et ne finit jamais).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MODEL = "fal-ai/ideogram/character";
// Timeout INDIVIDUEL par appel (les 4 tournent en parallèle). Marge sous
// maxDuration pour que les timeouts remontent en JSON propre.
const TIMEOUT_MS = 100_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

export async function POST(request: Request) {
  const key = process.env.FAL_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error: "not_configured",
        message: "Service non configuré (FAL_KEY absente côté serveur).",
      },
      { status: 500 },
    );
  }
  // Le client fal route TOUTES ses requêtes via ce fetch (uploads + polling de
  // statut). On force "no-store" pour que Next ne mette pas en cache le polling.
  const noStoreFetch: typeof fetch = (input, init) =>
    fetch(input, { ...init, cache: "no-store" });
  fal.config({ credentials: key, fetch: noStoreFetch });

  // 1) Corps : photo visiteur (dataURL) seule
  let photo: unknown;
  try {
    photo = (await request.json())?.photo;
  } catch {
    /* corps invalide → traité juste après */
  }
  if (typeof photo !== "string" || !photo.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "invalid_photo", message: "Photo manquante ou invalide." },
      { status: 400 },
    );
  }

  // 2) Upload de la référence vers fal.storage (l'API attend des URLs)
  let refUrl: string;
  try {
    const comma = photo.indexOf(",");
    const refBuf = Buffer.from(photo.slice(comma + 1), "base64");
    const refFile = new File([refBuf], "reference.jpg", {
      type: "image/jpeg",
    });
    refUrl = await fal.storage.upload(refFile);
  } catch (err) {
    console.error("[faceswap] échec upload référence:", err);
    return NextResponse.json(
      { error: "fal_error", message: "Échec de la génération. Réessayez." },
      { status: 502 },
    );
  }

  // 3) Les 4 scènes en PARALLÈLE, timeout individuel par appel
  const settled = await Promise.allSettled(
    scenes.map(async (scene) => {
      const t0 = Date.now();
      const result = await withTimeout(
        fal.subscribe(MODEL, {
          input: {
            prompt: scene.prompt,
            reference_image_urls: [refUrl],
            style: "REALISTIC",
          },
        }),
        TIMEOUT_MS,
      );
      // Sortie Ideogram : { images: [{ url, ... }], seed } — pas de
      // width/height garantis, on valide sur la seule présence de l'URL.
      const url = (result?.data as { images?: { url?: string }[] })
        ?.images?.[0]?.url;
      if (!url) throw new Error("réponse sans image");
      console.log(`[faceswap] ${scene.id} OK en ${Date.now() - t0} ms`);
      return { scene: scene.id, label: scene.label, url };
    }),
  );

  // 4) Tolérance aux échecs partiels : ≥ 1 succès = 200 (succès seuls).
  const results = settled
    .filter(
      (s): s is PromiseFulfilledResult<{ scene: string; label: string; url: string }> =>
        s.status === "fulfilled",
    )
    .map((s) => s.value);
  const failures = settled
    .map((s, i) => ({ s, scene: scenes[i].id }))
    .filter(({ s }) => s.status === "rejected")
    .map(({ s, scene }) => ({
      scene,
      reason:
        (s as PromiseRejectedResult).reason instanceof Error
          ? ((s as PromiseRejectedResult).reason as Error).message
          : String((s as PromiseRejectedResult).reason),
    }));
  failures.forEach(({ scene, reason }) =>
    console.error(`[faceswap] échec scène ${scene}: ${reason}`),
  );

  if (results.length === 0) {
    const allTimedOut =
      failures.length > 0 && failures.every(({ reason }) => reason === "timeout");
    return allTimedOut
      ? NextResponse.json(
          {
            error: "generation_timeout",
            message: "La génération a pris trop de temps. Réessayez.",
          },
          { status: 504 },
        )
      : NextResponse.json(
          { error: "fal_error", message: "Échec de la génération. Réessayez." },
          { status: 502 },
        );
  }
  return NextResponse.json({ results });
}
