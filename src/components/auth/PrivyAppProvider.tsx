"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { PrivyRuntimeProvider } from "./PrivyRuntime";

export function PrivyAppProvider({
  children,
  appId,
}: {
  children: React.ReactNode;
  appId?: string;
}) {
  const resolvedAppId = appId?.trim() || "";

  if (!resolvedAppId) {
    return <PrivyRuntimeProvider enabled={false}>{children}</PrivyRuntimeProvider>;
  }

  return (
    <PrivyRuntimeProvider enabled>
      <PrivyProvider
        appId={resolvedAppId}
        config={{
          loginMethods: ["sms", "email", "wallet"],
          embeddedWallets: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
          },
          intl: {
            defaultCountry: "NG",
          },
          appearance: {
            theme: "light",
            accentColor: "#f97316",
            showWalletLoginFirst: false,
            walletChainType: "ethereum-only",
          },
        }}
      >
        {children}
      </PrivyProvider>
    </PrivyRuntimeProvider>
  );
}
