import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage } from "@/lib/adminStore";

type Context = {
  params: Promise<{ code: string }>;
};

function sanitizeReferralIdentifier(input: string) {
  return input
    .trim()
    .replace(/^\u20A6/u, "")
    .replace(/^@/u, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 32);
}

export async function GET(req: NextRequest, { params }: Context) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const { code } = await params;
  const clean = sanitizeReferralIdentifier(code);

  const res = NextResponse.redirect(new URL("/agent", req.url), 302);
  if (clean) {
    res.cookies.set("nt_ref", clean, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  await logApiUsage({
    endpoint: "/r/[code]",
    method: "GET",
    status: 302,
    latencyMs: Date.now() - started,
    clientKey,
  });

  return res;
}
