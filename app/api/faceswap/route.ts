import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { scenes } from "@/lib/content";

/*
 * POST /api/faceswap — appel fal.ai CÔTÉ SERVEUR (Bloc 5+).
 *
 * SÉCURITÉ : FAL_KEY est lue depuis l'env serveur et n'est JAMAIS exposée au
 * navigateur. Le client envoie la photo (dataURL) + l'id de scène ; clé serveur.
 *
 * Entrée (JSON) : { photo: dataURL, scene: <id de scène> }
 * Modèle : fal-ai/face-swap.
 *   - swap_image_url = LE VISAGE à utiliser  → photo du visiteur
 *   - base_image_url = la SCÈNE cible          → public/targets/<scene.file>
 *
 * La scène est résolue via la WHITELIST `scenes` (id → fichier) : pas de chemin
 * arbitraire venant du client (anti path-traversal).
 *
 * Réponses :
 *   200 { url, width, height }        succès (résultat validé)
 *   400 { error, message }            photo invalide / scène inconnue ou absente
 *   500 { error, message }            FAL_KEY absente côté serveur
 *   502 { error:"fal_error", ... }    échec fal / résultat invalide ou vide
 *   504 { error:"generation_timeout" } fal trop lent (> TIMEOUT_MS)
 */

export const runtime = "nodejs"; // fs/Buffer + SDK fal → runtime Node
// maxDuration > TIMEOUT_MS : notre JSON d'erreur revient AVANT que la plateforme
// ne tue la fonction (sinon 504 brut sans corps). Projet sur une ÉQUIPE Vercel
// (= Pro+, limite 300 s ; le plafond 60 s ne concerne QUE les comptes Hobby
// perso) → 130 s OK en prod. À confirmer dans le dashboard si doute sur le tier.
export const maxDuration = 130;
// Empêche Next de cacher/mémoïser les requêtes de cette route (sinon le polling
// de statut de fal.subscribe voit une réponse figée et ne finit jamais).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MODEL = "fal-ai/face-swap";
// fal peut être lent en pic de charge (latence observée très variable :
// ~16 s → 126 s) → marge large, sans bloquer à l'infini.
const TIMEOUT_MS = 120_000;

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

  // 1) Corps : photo visiteur (dataURL) + id de scène
  let photo: unknown;
  let sceneParam: unknown;
  try {
    const body = await request.json();
    photo = body?.photo;
    sceneParam = body?.scene;
  } catch {
    /* corps invalide → traité juste après */
  }
  if (typeof photo !== "string" || !photo.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "invalid_photo", message: "Photo manquante ou invalide." },
      { status: 400 },
    );
  }

  // 2) Résolution de la scène via la WHITELIST (id ou fichier déclaré).
  //    Défaut = première scène si rien n'est fourni.
  const scene =
    typeof sceneParam === "string"
      ? scenes.find((s) => s.id === sceneParam || s.file === sceneParam)
      : scenes[0];
  if (!scene) {
    return NextResponse.json(
      { error: "invalid_scene", message: "Scène inconnue." },
      { status: 400 },
    );
  }

  // 3) Chargement de l'image de scène (public/targets/<scene.file>)
  const origin = new URL(request.url).origin;
  let baseFile: File;
  try {
    const r = await fetch(`${origin}/targets/${scene.file}`);
    if (!r.ok) throw new Error("not found");
    const buf = Buffer.from(await r.arrayBuffer());
    baseFile = new File([buf], scene.file, {
      type: r.headers.get("content-type") || "image/jpeg",
    });
  } catch {
    return NextResponse.json(
      {
        error: "target_missing",
        message: `Image de scène introuvable (public/targets/${scene.file}).`,
      },
      { status: 400 },
    );
  }

  // 4) Upload des 2 images vers fal.storage + appel du modèle
  try {
    const comma = photo.indexOf(",");
    const swapBuf = Buffer.from(photo.slice(comma + 1), "base64");
    const swapFile = new File([swapBuf], "source.jpg", { type: "image/jpeg" });

    const [swapUrl, baseUrl] = await Promise.all([
      fal.storage.upload(swapFile),
      fal.storage.upload(baseFile),
    ]);

    const result = await withTimeout(
      fal.subscribe(MODEL, {
        input: { swap_image_url: swapUrl, base_image_url: baseUrl },
      }),
      TIMEOUT_MS,
    );

    // 5) Vérifie que le swap a VRAIMENT abouti : URL exploitable + dims > 0.
    const image = result?.data?.image;
    const url = image?.url;
    const width = image?.width ?? 0;
    const height = image?.height ?? 0;
    if (!url || width <= 0 || height <= 0) {
      console.error("[faceswap] résultat invalide:", JSON.stringify(image));
      return NextResponse.json(
        {
          error: "fal_error",
          message: "La génération a échoué. Réessayez.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ url, width, height });
  } catch (err) {
    const timedOut = err instanceof Error && err.message === "timeout";
    console.error("[faceswap]", timedOut ? "timeout" : err);
    return timedOut
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
}
