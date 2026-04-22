import { NextRequest, NextResponse } from "next/server";

import { applyReferralCodeForUser, logApiUsage, upsertPrivyUser } from "@/lib/adminStore";
import { createSessionToken } from "@/lib/session";
import {
  extractPrivyProfile,
  isPrivyConfigured,
  verifyPrivyAccessToken,
} from "@/lib/privy";

function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

async function accessTokenFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;

  const body = (await req.json().catch(() => null)) as
    | { accessToken?: string }
    | null;
  return body?.accessToken?.trim() || "";
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const referralCookie = req.cookies.get("nt_ref")?.value || "";

  try {
    if (!isPrivyConfigured()) {
      return NextResponse.json(
        { error: "privy_not_configured" },
        { status: 503 }
      );
    }

    const accessToken = await accessTokenFromRequest(req);
    if (!accessToken) {
      return NextResponse.json(
        { error: "missing_access_token" },
        { status: 400 }
      );
    }

    const { claims, user: privyUser } = await verifyPrivyAccessToken(accessToken);
    const profile = extractPrivyProfile(privyUser);
    const user = await upsertPrivyUser({
      privyUserId: claims.user_id,
      ...profile,
      ip: clientIp(req),
    });

    if (referralCookie) {
      try {
        await applyReferralCodeForUser({
          userId: user.id,
          referralCode: referralCookie,
          source: "link",
        });
      } catch {
        // Best-effort; never block sign-in.
      }
    }

    const token = createSessionToken({ uid: user.id, phone: user.phone });
    const res = NextResponse.json({
      ok: true,
      user,
      privyUserId: claims.user_id,
    });

    res.cookies.set("nt_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    if (referralCookie) {
      res.cookies.set("nt_ref", "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
    }

    await logApiUsage({
      endpoint: "/api/auth/privy/session",
      method: "POST",
      status: 200,
      latencyMs: Date.now() - started,
      clientKey: "privy",
    });

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "privy_auth_failed";
    const status =
      message === "privy_not_configured"
        ? 503
        : message === "missing_access_token"
          ? 400
          : 401;

    await logApiUsage({
      endpoint: "/api/auth/privy/session",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey: "privy",
    });

    return NextResponse.json({ error: message }, { status });
  }
}
