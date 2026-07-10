import { NextResponse } from "next/server";
import type { QuizRound } from "@/lib/content";
import { getSupabase, BANK_BUCKET, retentionDays } from "@/lib/supabase-server";

/*
 * GET /api/bank/quiz — pool DYNAMIQUE du quiz (lecture publique, P1 vague 1).
 *
 * Renvoie les entrées `approved` de la banque (dans la fenêtre de rétention
 * RETENTION_DAYS), mappées au format QuizRound de lib/content.ts pour que le
 * quiz les consomme telles quelles (pool FAKE prioritaire, vague 3).
 * mediaUrl = URL SIGNÉE courte (10 min) sur le bucket privé : rien de public,
 * l'URL expire après la session de quiz.
 *
 * JAMAIS d'erreur pour un pool vide (ou une env absente) : le quiz retombe
 * silencieusement sur sa banque statique — 200 { rounds: [] }.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SIGNED_URL_TTL_S = 600; // 10 min — le temps d'une session de quiz
const MAX_ENTRIES = 50; // borne le travail de signature ; les plus récentes

// Révélation générique — cohérente avec le cadre éthique : l'image est 100 %
// générée (sortie Ideogram), le visage de référence appartient à un visiteur
// CONSENTANT (opt-in banque séparé + modération facilitateur).
const EXPLANATION =
  "Image générée dans ce showroom via Ideogram Character, avec le consentement " +
  "explicite du visiteur : son visage a servi de référence et toute la scène " +
  "(décor, lumière, personnages) a été générée autour. La scène n'a jamais existé.";
const INDICES = [
  "Image 100 % synthétique : décor et figurants n'existent pas",
  "Cohérence lumière/ombres entre le visage et le décor à scruter",
  "Arrière-plan « trop propre » : détails génériques, textes illisibles",
];

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ rounds: [] });

  const cutoff = new Date(
    Date.now() - retentionDays() * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: entries, error } = await supabase
    .from("bank_entries")
    .select("id, label, storage_path")
    .eq("status", "approved")
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(MAX_ENTRIES);
  if (error || !entries || entries.length === 0) {
    if (error) console.error("[bank/quiz] lecture impossible:", error.message);
    return NextResponse.json({ rounds: [] });
  }

  // URLs signées en une passe ; une signature manquante = entrée ignorée
  // (jamais d'erreur : le pool rétrécit, le quiz complète en statique).
  const { data: signed, error: signError } = await supabase.storage
    .from(BANK_BUCKET)
    .createSignedUrls(
      entries.map((e) => e.storage_path),
      SIGNED_URL_TTL_S,
    );
  if (signError || !signed) {
    console.error("[bank/quiz] signature impossible:", signError?.message);
    return NextResponse.json({ rounds: [] });
  }
  const urlByPath = new Map(
    signed.filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]),
  );

  const rounds: QuizRound[] = entries.flatMap((e) => {
    const url = urlByPath.get(e.storage_path);
    if (!url) return [];
    return [
      {
        id: `bank-${e.id}`,
        mediaType: "image" as const,
        mediaUrl: url,
        isDeepfake: true,
        explanation: EXPLANATION,
        indices: INDICES,
      },
    ];
  });

  return NextResponse.json({ rounds });
}
