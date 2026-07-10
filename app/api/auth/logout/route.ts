import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-server";

/* POST /api/auth/logout — purge le cookie de session facilitateur. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return res;
}
