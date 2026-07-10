import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/*
 * Session facilitateur — cookie httpOnly signé HMAC (SERVEUR UNIQUEMENT).
 *
 * Format du cookie : "<expiration_ms>.<hmac_sha256(expiration_ms)>", signé
 * avec AUTH_SECRET. Pas de session en base : le cookie se suffit (un seul
 * rôle, pas de comptes, pas de révocation individuelle — pour révoquer tout
 * le monde, changer AUTH_SECRET).
 */

export const SESSION_COOKIE = "facilitator_session";
export const SESSION_MAX_AGE_S = 12 * 60 * 60; // 12 h — une journée de showroom

function hmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Comparaison timing-safe de deux chaînes (via digest à longueur fixe). */
export function safeEqual(a: string, b: string): boolean {
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}

/** Valeur de cookie signée, ou null si AUTH_SECRET absente. */
export function makeSessionCookie(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const exp = String(Date.now() + SESSION_MAX_AGE_S * 1000);
  return `${exp}.${hmac(exp, secret)}`;
}

/** Le cookie de la requête est-il une session facilitateur valide ? */
function isFacilitator(request: Request): boolean {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const raw = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig) return false;
  if (!safeEqual(sig, hmac(exp, secret))) return false;
  return Number(exp) > Date.now();
}

/**
 * Garde des routes de modération : renvoie la 401 à retourner telle quelle,
 * ou null si la session est valide. Usage :
 *   const denied = requireFacilitator(request);
 *   if (denied) return denied;
 */
export function requireFacilitator(request: Request): NextResponse | null {
  if (isFacilitator(request)) return null;
  return NextResponse.json(
    { error: "unauthorized", message: "Session facilitateur requise." },
    { status: 401 },
  );
}
