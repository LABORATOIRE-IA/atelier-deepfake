import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * Client Supabase SERVICE-ROLE — SERVEUR UNIQUEMENT (même hygiène que FAL_KEY :
 * clé en .env.local, jamais en dur, jamais côté navigateur).
 *
 * `import "server-only"` fait ÉCHOUER LA COMPILATION si ce module est importé
 * depuis du code client — c'est le garde-fou : la clé service-role contourne
 * la RLS et ne doit jamais approcher le navigateur.
 *
 * La RLS de bank_entries est en deny-all : seules les routes serveur (via ce
 * client) lisent/écrivent la table et le bucket privé `bank`.
 */

let cached: SupabaseClient | null = null;

/**
 * Client service-role, ou null si l'env n'est pas configurée (les routes
 * décident alors de leur réponse : 500 typée côté écriture, pool vide côté
 * lecture quiz).
 */
export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Bucket Storage PRIVÉ des images de la banque (accès par URL signée). */
export const BANK_BUCKET = "bank";

/** Rétention des entrées (jours) — RETENTION_DAYS en env, défaut 180. */
export function retentionDays(): number {
  const n = Number(process.env.RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? n : 180;
}
