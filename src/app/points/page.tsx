import type { Metadata } from "next";
import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/session";
import {
  UserPointsView,
  type UserPointsData,
} from "@/components/nairatag/UserPointsView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Points",
  description: "Your NairaTag welcome rewards, referral bonuses, and points history.",
};

async function loadPointsData(): Promise<UserPointsData> {
  const cookieStore = await cookies();
  const token = cookieStore.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) return null;

  const { getPointsHistoryForUser } = await import("@/lib/adminStore");

  try {
    return await getPointsHistoryForUser(payload.uid);
  } catch {
    return null;
  }
}

export default async function PointsPage() {
  const data = await loadPointsData();
  return <UserPointsView data={data} />;
}
