import { NextResponse, type NextRequest } from "next/server";

import {
  getBankAccountForUser,
  getClaimByUserId,
  getUserById,
  logApiUsage,
  updateUserProfileForUser,
} from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

function profileStatusForError(message: string) {
  if (
    message === "invalid_full_name" ||
    message === "invalid_avatar_url" ||
    message === "avatar_too_large" ||
    message === "invalid_handle" ||
    message === "already_claimed" ||
    message === "missing_handle"
  ) {
    return 400;
  }
  if (message === "user_not_found") return 401;
  return 500;
}

export async function PATCH(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  const token = req.cookies.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;

  if (!payload) {
    const res = NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/profile/me",
      method: "PATCH",
      status: 401,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }

  try {
    const body = (await req.json().catch(() => null)) as
      | {
          fullName?: string;
          avatarUrl?: string;
          handle?: string;
        }
      | null;

    const result = await updateUserProfileForUser({
      userId: payload.uid,
      fullName: body?.fullName,
      avatarUrl: body?.avatarUrl,
      handle: body?.handle,
    });
    const [user, claim, bankAccount] = await Promise.all([
      getUserById(payload.uid),
      getClaimByUserId(payload.uid),
      getBankAccountForUser(payload.uid),
    ]);
    const res = NextResponse.json(
      {
        ok: true,
        user: user ?? result.user,
        claim: claim ?? result.claim,
        bankAccount,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/profile/me",
      method: "PATCH",
      status: 200,
      latencyMs: Date.now() - started,
      clientKey,
      handle: claim?.handle,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = profileStatusForError(message);
    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/profile/me",
      method: "PATCH",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }
}
