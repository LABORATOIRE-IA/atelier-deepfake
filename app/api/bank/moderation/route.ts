import { NextResponse } from "next/server";
import { requireFacilitator } from "@/lib/auth-server";
import { getSupabase, BANK_BUCKET, retentionDays } from "@/lib/supabase-server";

/*
 * GET /api/bank/moderation — liste complète pour l'écran facilitateur
 * (P1, vague 3). AUTH REQUISE (cookie session) — jamais appelée par le
 * kiosque.
 *
 * Renvoie TOUTES les entrées (pending d'abord, puis par date décroissante) :
 *   { id, scene, label, status, createdAt, moderatedAt,
 *     expired,        ← created_at hors fenêtre RETENTION_DAYS
 *     mediaUrl }      ← URL signée 10 min ; null si média purgé (rejected)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SIGNED_URL_TTL_S = 600;
const MAX_ENTRIES = 200;

export async function GET(request: Request) {
  const denied = requireFacilitator(request);
  if (denied) return denied;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "not_configured", message: "Env Supabase absente." },
      { status: 500 },
    );
  }

  const { data: rows, error } = await supabase
    .from("bank_entries")
    .select("id, scene, label, storage_path, status, created_at, moderated_at")
    .order("created_at", { ascending: false })
    .limit(MAX_ENTRIES);
  if (error) {
    console.error("[bank/moderation] lecture impossible:", error.message);
    return NextResponse.json(
      { error: "db_error", message: "Lecture de la banque impossible." },
      { status: 502 },
    );
  }

  // URLs signées pour les entrées qui ont encore un média (reject purge
  // l'objet : la ligne reste comme trace, sans média → mediaUrl null).
  const withMedia = (rows ?? []).filter((r) => r.status !== "rejected");
  const urlByPath = new Map<string, string>();
  if (withMedia.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BANK_BUCKET)
      .createSignedUrls(
        withMedia.map((r) => r.storage_path),
        SIGNED_URL_TTL_S,
      );
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    });
  }

  const cutoff = Date.now() - retentionDays() * 24 * 60 * 60 * 1000;
  const entries = (rows ?? [])
    .map((r) => ({
      id: r.id,
      scene: r.scene,
      label: r.label,
      status: r.status,
      createdAt: r.created_at,
      moderatedAt: r.moderated_at,
      expired: new Date(r.created_at).getTime() <= cutoff,
      mediaUrl: urlByPath.get(r.storage_path) ?? null,
    }))
    // pending d'abord (à traiter), le reste garde l'ordre par date
    .sort((a, b) => {
      if ((a.status === "pending") !== (b.status === "pending"))
        return a.status === "pending" ? -1 : 1;
      return 0;
    });

  return NextResponse.json({ entries });
}
