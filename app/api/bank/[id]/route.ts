import { NextResponse } from "next/server";
import { requireFacilitator } from "@/lib/auth-server";
import { getSupabase, BANK_BUCKET } from "@/lib/supabase-server";

/*
 * DELETE /api/bank/[id] — suppression COMPLÈTE ligne + média (AUTH REQUISE).
 * Droit de retrait RGPD : contrairement au reject, il ne reste RIEN.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireFacilitator(request);
  if (denied) return denied;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "not_configured", message: "Env Supabase absente." },
      { status: 500 },
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "invalid_id", message: "Identifiant invalide." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("bank_entries")
    .delete()
    .eq("id", id)
    .select("storage_path")
    .maybeSingle();
  if (error) {
    console.error("[bank/delete] échec:", error.message);
    return NextResponse.json(
      { error: "db_error", message: "Suppression impossible." },
      { status: 502 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "not_found", message: "Entrée inconnue." },
      { status: 404 },
    );
  }

  // Média : peut être déjà purgé (entrée rejected) → erreur non bloquante.
  const { error: rmError } = await supabase.storage
    .from(BANK_BUCKET)
    .remove([data.storage_path]);
  if (rmError)
    console.error("[bank/delete] purge storage:", rmError.message);

  return NextResponse.json({ ok: true });
}
