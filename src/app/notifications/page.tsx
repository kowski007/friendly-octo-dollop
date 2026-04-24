import type { Metadata } from "next";
import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/session";
import {
  UserNotificationsView,
  type UserNotificationsData,
} from "@/components/nairatag/UserNotificationsView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Your signed-in NairaTag notifications.",
};

async function loadNotificationsData(): Promise<UserNotificationsData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) return null;

  const { getClaimByUserId, getUserById, listNotifications } = await import(
    "@/lib/adminStore"
  );

  const user = await getUserById(payload.uid);
  if (!user) return null;

  const [claim, notifications] = await Promise.all([
    getClaimByUserId(user.id),
    listNotifications({ userId: user.id, limit: 50 }),
  ]);

  return {
    user,
    claim,
    notifications,
  };
}

export default async function NotificationsPage() {
  const data = await loadNotificationsData();
  return <UserNotificationsView data={data} />;
}
