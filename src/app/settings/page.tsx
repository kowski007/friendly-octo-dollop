import type { Metadata } from "next";
import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/session";
import {
  UserSettingsView,
  type UserSettingsData,
} from "@/components/nairatag/UserSettingsView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your signed-in NairaTag account settings and preferences.",
};

async function loadSettingsData(): Promise<UserSettingsData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) return null;

  const {
    getBankAccountForUser,
    getClaimByUserId,
    getCryptoWalletForUserHandle,
    getUserById,
    listNotifications,
  } = await import("@/lib/adminStore");

  const user = await getUserById(payload.uid);
  if (!user) return null;

  const [claim, bankAccount, notifications] = await Promise.all([
    getClaimByUserId(user.id),
    getBankAccountForUser(user.id),
    listNotifications({ userId: user.id, limit: 12 }),
  ]);

  const cryptoWallet = claim
    ? await getCryptoWalletForUserHandle({
        userId: user.id,
        handle: claim.handle,
        chain: "base",
      })
    : null;

  return {
    user,
    claim,
    bankAccount,
    cryptoWallet,
    notifications: {
      total: notifications.total,
      unread: notifications.unread,
    },
  };
}

export default async function SettingsPage() {
  const data = await loadSettingsData();
  return <UserSettingsView data={data} />;
}
