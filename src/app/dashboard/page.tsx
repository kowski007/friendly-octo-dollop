import type { Metadata } from "next";
import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/session";
import {
  UserDashboardView,
  type UserDashboardData,
} from "@/components/nairatag/UserDashboardView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  description:
    "Your signed-in NairaTag account, profile, payout, referral, and marketplace tools.",
};

async function loadDashboardData(): Promise<UserDashboardData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("nt_session")?.value || "";
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) return null;

  const {
    getBankAccountForUser,
    getClaimByUserId,
    getCryptoWalletForUserHandle,
    getMarketplaceDashboardForUser,
    getReferralDashboardForUser,
    getUserById,
    listNotifications,
  } = await import("@/lib/adminStore");

  const user = await getUserById(payload.uid);
  if (!user) return null;

  const [claim, bankAccount, notifications, referrals, marketplace] =
    await Promise.all([
      getClaimByUserId(user.id),
      getBankAccountForUser(user.id),
      listNotifications({ userId: user.id, limit: 8 }),
      getReferralDashboardForUser(user.id).catch(() => null),
      getMarketplaceDashboardForUser(user.id).catch(() => null),
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
    notifications,
    referrals,
    marketplace,
  };
}

export default async function DashboardPage() {
  const data = await loadDashboardData();
  return <UserDashboardView data={data} />;
}
