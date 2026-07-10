import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { scenes } from "@/lib/content";
import { getSupabase, BANK_BUCKET } from "@/lib/supabase-server";

/*
 * POST /api/bank — soumission KIOSQUE (non authentifiée) d'une image générée
 * vers la banque du quiz (P1, vague 1). Gabarit de la route faceswap.
 *
 * Le visiteur a opté pour la banque (consentement séparé côté client) et
 * choisi sa scène préférée : le client envoie l'URL fal du résultat + l'id de
 * scène. Le SERVEUR re-télécharge l'image (les URLs fal.media sont à rétention
 * limitée) et la dépose dans le bucket privé `bank` ; la ligne naît `pending`
 * et n'entre dans le quiz qu'après modération facilitateur.
 *
 * ANTI-SSRF : on ne télécharge JAMAIS une URL arbitraire venant du client —
 * https uniquement, host fal.media strict, type image/*, taille ≤ 5 Mo.
 * La scène est résolue via la whitelist `scenes` (comme pour la génération).
 *
 * Entrée (JSON) : { url: <https://*.fal.media/...>, scene: <id de scène> }
 * Réponses :
 *   201 { id }                    soumis (statut pending)
 *   400 { error, message }        url/scène/type/taille invalides
 *   500 { error, message }        env Supabase absente côté serveur
 *   502 { error, message }        téléchargement fal ou upload/insert Supabase
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const DOWNLOAD_TIMEOUT_MS = 30_000;

/** Extension par content-type (Ideogram renvoie du PNG ; on reste fidèle). */
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** URL https dont le host est fal.media (ou un sous-domaine) — sinon null. */
function allowedFalUrl(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.hostname !== "fal.media" && !u.hostname.endsWith(".fal.media"))
    return null;
  return u;
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      {
        error: "not_configured",
        message: "Service non configuré (env Supabase absente côté serveur).",
      },
      { status: 500 },
    );
  }

  // 1) Corps : URL fal du résultat + id de scène (whitelist serveur)
  let urlParam: unknown;
  let sceneParam: unknown;
  try {
    const body = await request.json();
    urlParam = body?.url;
    sceneParam = body?.scene;
  } catch {
    /* corps invalide → traité juste après */
  }
  const falUrl = allowedFalUrl(urlParam);
  if (!falUrl) {
    return NextResponse.json(
      {
        error: "invalid_url",
        message: "URL invalide (https fal.media uniquement).",
      },
      { status: 400 },
    );
  }
  const scene = scenes.find((s) => s.id === sceneParam);
  if (!scene) {
    return NextResponse.json(
      { error: "invalid_scene", message: "Scène inconnue." },
      { status: 400 },
    );
  }

  // 2) Téléchargement contrôlé de l'image chez fal
  let bytes: ArrayBuffer;
  let contentType: string;
  try {
    const r = await fetch(falUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!r.ok) throw new Error(`fal HTTP ${r.status}`);
    contentType = r.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "invalid_image", message: "La ressource n'est pas une image." },
        { status: 400 },
      );
    }
    bytes = await r.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "invalid_image", message: "Image vide ou > 5 Mo." },
        { status: 400 },
      );
    }
  } catch (err) {
    console.error("[bank] échec téléchargement fal:", err);
    return NextResponse.json(
      { error: "download_failed", message: "Téléchargement de l'image impossible." },
      { status: 502 },
    );
  }

  // 3) Upload bucket privé + insertion `pending`
  const ext = EXT_BY_TYPE[contentType.split(";")[0].trim()] ?? "jpg";
  const storagePath = `${randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BANK_BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: false });
  if (uploadError) {
    console.error("[bank] échec upload storage:", uploadError.message);
    return NextResponse.json(
      { error: "storage_failed", message: "Enregistrement de l'image impossible." },
      { status: 502 },
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("bank_entries")
    .insert({
      scene: scene.id,
      label: scene.label, // résolu SERVEUR (jamais le label du client)
      storage_path: storagePath,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertError || !row?.id) {
    // Pas de ligne → l'objet uploadé est orphelin : on le purge.
    console.error("[bank] échec insert:", insertError?.message);
    await supabase.storage.from(BANK_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: "insert_failed", message: "Enregistrement impossible." },
      { status: 502 },
    );
  }

  return NextResponse.json({ id: row.id }, { status: 201 });
}
