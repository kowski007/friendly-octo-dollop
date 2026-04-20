import { NextResponse, type NextRequest } from "next/server";

import {
  getBankAccountForUser,
  getClaimByUserId,
  getUserById,
} from "@/lib/adminStore";
import { verifySessionToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const [user, claim, bankAccount] = await Promise.all([
    getUserById(payload.uid),
    getClaimByUserId(payload.uid),
    getBankAccountForUser(payload.uid),
  ]);
  if (!user) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { ok: true, user, claim, bankAccount },
    { headers: { "Cache-Control": "no-store" } }
  );
}
