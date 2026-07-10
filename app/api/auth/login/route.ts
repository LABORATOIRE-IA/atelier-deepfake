import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  makeSessionCookie,
  safeEqual,
} from "@/lib/auth-server";

/*
 * POST /api/auth/login — session facilitateur (P1, vague 3).
 *
 * CHOIX ASSUMÉ : cookie signé maison plutôt que NextAuth. Le besoin est UN
 * rôle partagé (facilitateur), zéro compte, un écran d'exploitation dans un
 * showroom — un mot de passe env + cookie HMAC couvrent ça sans dépendance.
 * Migration NextAuth/SSO possible plus tard SANS toucher ni la table
 * bank_entries ni les routes de modération : seul ce fichier et
 * lib/auth-server.ts (requireFacilitator) changeraient.
 *
 * Entrée : { password } → comparaison timing-safe avec FACILITATOR_PASSWORD.
 * Succès : cookie httpOnly signé (HMAC AUTH_SECRET), Secure en prod,
 * SameSite=Lax, maxAge 12 h. Échec : 401 (message neutre, pas d'indice).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const expected = process.env.FACILITATOR_PASSWORD;
  if (!expected || !process.env.AUTH_SECRET) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "Service non configuré (FACILITATOR_PASSWORD / AUTH_SECRET absents).",
      },
      { status: 500 },
    );
  }

  let password: unknown;
  try {
    password = (await request.json())?.password;
  } catch {
    /* corps invalide → 401 neutre ci-dessous */
  }
  if (typeof password !== "string" || !safeEqual(password, expected)) {
    return NextResponse.json(
      { error: "unauthorized", message: "Mot de passe incorrect." },
      { status: 401 },
    );
  }

  const cookie = makeSessionCookie();
  if (!cookie) {
    return NextResponse.json(
      { error: "not_configured", message: "AUTH_SECRET absente." },
      { status: 500 },
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_S,
    path: "/",
  });
  return res;
}
