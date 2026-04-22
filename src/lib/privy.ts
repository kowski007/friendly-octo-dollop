import { PrivyClient, type User } from "@privy-io/node";

let cachedClient: PrivyClient | null = null;

export function privyAppId() {
  return process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
}

export function isPrivyConfigured() {
  return Boolean(privyAppId() && process.env.PRIVY_APP_SECRET);
}

function getPrivyClient() {
  const appId = privyAppId();
  const appSecret = process.env.PRIVY_APP_SECRET || "";
  if (!appId || !appSecret) throw new Error("privy_not_configured");

  if (!cachedClient) {
    cachedClient = new PrivyClient({
      appId,
      appSecret,
      jwtVerificationKey: process.env.PRIVY_JWT_VERIFICATION_KEY || undefined,
    });
  }

  return cachedClient;
}

export async function verifyPrivyAccessToken(accessToken: string) {
  const client = getPrivyClient();
  const claims = await client.utils().auth().verifyAccessToken(accessToken);
  const expectedAppId = privyAppId();
  if (claims.app_id !== expectedAppId) throw new Error("privy_app_mismatch");

  const user = await client.users()._get(claims.user_id);
  return { claims, user };
}

export function extractPrivyProfile(user: User) {
  let phone: string | undefined;
  let email: string | undefined;
  let walletAddress: string | undefined;
  let fullName: string | undefined;

  for (const account of user.linked_accounts) {
    if (account.type === "phone") {
      phone = phone || account.phoneNumber || account.number;
      continue;
    }

    if (account.type === "email") {
      email = email || account.address;
      continue;
    }

    if (
      (account.type === "wallet" || account.type === "smart_wallet") &&
      "address" in account
    ) {
      walletAddress = walletAddress || account.address;
    }

    if (!email && "email" in account && typeof account.email === "string") {
      email = account.email;
    }

    if (!fullName && "name" in account && typeof account.name === "string") {
      fullName = account.name;
    }

    if (
      !fullName &&
      "display_name" in account &&
      typeof account.display_name === "string"
    ) {
      fullName = account.display_name;
    }

    if (
      !fullName &&
      "username" in account &&
      typeof account.username === "string"
    ) {
      fullName = account.username;
    }
  }

  return { phone, email, walletAddress, fullName };
}
