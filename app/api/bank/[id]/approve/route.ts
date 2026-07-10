import { NextResponse } from "next/server";
import { requireFacilitator } from "@/lib/auth-server";
import { getSupabase } from "@/lib/supabase-server";

/*
 * POST /api/bank/[id]/approve — modération facilitateur (AUTH REQUISE).
 * pending → approved (+ moderated_at) : l'entrée devient éligible au pool
 * quiz (/api/bank/quiz).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
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
    .update({ status: "approved", moderated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[bank/approve] échec:", error.message);
    return NextResponse.json(
      { error: "db_error", message: "Mise à jour impossible." },
      { status: 502 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "not_found", message: "Entrée inconnue." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
