import { getAddress, isAddress } from "viem";

import {
  getClaimByUserId,
  getDefaultCryptoWalletForHandle,
  getHandleSocialForUser,
  getUserById,
  markTelegramSocialEnsSynced,
  normalizeHandle,
} from "./adminStore";
import {
  ensSyncChainId,
  ensTextRecordKeyTelegram,
  getEnsTransaction,
  inspectEnsTextRecord,
  nairaTagEnsName,
  prepareEnsSetTextTransaction,
  waitForEnsTransactionReceipt,
} from "./ens";

type EnsTxHash = `0x${string}`;

type TelegramEnsSyncReason =
  | "ready"
  | "already_synced"
  | "ens_parent_not_configured"
  | "telegram_not_verified"
  | "wallet_required"
  | "ens_name_missing"
  | "ens_resolver_missing"
  | "ens_text_not_supported"
  | "ens_owner_wallet_mismatch";

export type TelegramEnsSyncStatus = {
  socialId: string;
  handle: string;
  ensName: string | null;
  key: string;
  expectedValue: string;
  currentValue: string | null;
  chainId: number;
  linkedWalletAddress: string | null;
  ownerAddress: string | null;
  resolverAddress: string | null;
  verified: boolean;
  ensSynced: boolean;
  ensSyncedAt?: string;
  ensTxHash?: string;
  canPrepareTransaction: boolean;
  reason: TelegramEnsSyncReason;
};

function normalizeTelegramRecordValue(value: string | null | undefined) {
  return (value ?? "").trim().replace(/^@/u, "").toLowerCase();
}

async function loadTelegramEnsContext({
  userId,
  handle,
  socialId,
}: {
  userId: string;
  handle: string;
  socialId: string;
}) {
  const normalizedHandle = normalizeHandle(handle);
  const [user, claim, social, cryptoWallet] = await Promise.all([
    getUserById(userId),
    getClaimByUserId(userId),
    getHandleSocialForUser({ userId, handle: normalizedHandle || handle, socialId }),
    getDefaultCryptoWalletForHandle(userId, normalizedHandle || handle, "base"),
  ]);

  if (!user) throw new Error("user_not_found");
  if (!claim || !normalizedHandle || claim.handle !== normalizedHandle) {
    throw new Error("handle_not_owned");
  }

  const linkedWalletAddress =
    cryptoWallet?.walletAddress ?? user.walletAddress ?? null;
  const ensName = nairaTagEnsName(normalizedHandle);

  return {
    user,
    claim,
    social,
    ensName,
    linkedWalletAddress,
    normalizedHandle,
  };
}

export async function getTelegramEnsSyncStatus({
  userId,
  handle,
  socialId,
}: {
  userId: string;
  handle: string;
  socialId: string;
}): Promise<TelegramEnsSyncStatus> {
  const { social, ensName, linkedWalletAddress, normalizedHandle } =
    await loadTelegramEnsContext({
    userId,
    handle,
    socialId,
    });
  const key = ensTextRecordKeyTelegram();
  const expectedValue = normalizeTelegramRecordValue(social.username);

  if (!ensName) {
    return {
      socialId: social.id,
      handle: normalizedHandle,
      ensName: null,
      key,
      expectedValue,
      currentValue: null,
      chainId: ensSyncChainId(),
      linkedWalletAddress,
      ownerAddress: null,
      resolverAddress: null,
      verified: social.verified,
      ensSynced: social.ensSynced,
      ensSyncedAt: social.ensSyncedAt,
      ensTxHash: social.ensTxHash,
      canPrepareTransaction: false,
      reason: "ens_parent_not_configured",
    };
  }

  const onchain = await inspectEnsTextRecord({ name: ensName, key });
  const currentValue = normalizeTelegramRecordValue(onchain?.currentValue);
  const ownerAddress = onchain?.ownerAddress ?? null;
  const resolverAddress = onchain?.resolverAddress ?? null;

  if (!social.verified) {
    return {
      socialId: social.id,
      handle: normalizedHandle,
      ensName,
      key,
      expectedValue,
      currentValue,
      chainId: ensSyncChainId(),
      linkedWalletAddress,
      ownerAddress,
      resolverAddress,
      verified: false,
      ensSynced: false,
      ensSyncedAt: social.ensSyncedAt,
      ensTxHash: social.ensTxHash,
      canPrepareTransaction: false,
      reason: "telegram_not_verified",
    };
  }

  if (!linkedWalletAddress) {
    return {
      socialId: social.id,
      handle: normalizedHandle,
      ensName,
      key,
      expectedValue,
      currentValue,
      chainId: ensSyncChainId(),
      linkedWalletAddress: null,
      ownerAddress,
      resolverAddress,
      verified: true,
      ensSynced: social.ensSynced,
      ensSyncedAt: social.ensSyncedAt,
      ensTxHash: social.ensTxHash,
      canPrepareTransaction: false,
      reason: "wallet_required",
    };
  }

  if (!ownerAddress) {
    return {
      socialId: social.id,
      handle: normalizedHandle,
      ensName,
      key,
      expectedValue,
      currentValue,
      chainId: ensSyncChainId(),
      linkedWalletAddress,
      ownerAddress: null,
      resolverAddress,
      verified: true,
      ensSynced: social.ensSynced,
      ensSyncedAt: social.ensSyncedAt,
      ensTxHash: social.ensTxHash,
      canPrepareTransaction: false,
      reason: "ens_name_missing",
    };
  }

  if (!resolverAddress) {
    return {
      socialId: social.id,
      handle: normalizedHandle,
      ensName,
      key,
      expectedValue,
      currentValue,
      chainId: ensSyncChainId(),
      linkedWalletAddress,
      ownerAddress,
      resolverAddress: null,
      verified: true,
      ensSynced: social.ensSynced,
      ensSyncedAt: social.ensSyncedAt,
      ensTxHash: social.ensTxHash,
      canPrepareTransaction: false,
      reason: "ens_resolver_missing",
    };
  }

  if (!onchain?.supportsTextRecords) {
    return {
      socialId: social.id,
      handle,
      ensName,
      key,
      expectedValue,
      currentValue,
      chainId: ensSyncChainId(),
      linkedWalletAddress,
      ownerAddress,
      resolverAddress,
      verified: true,
      ensSynced: social.ensSynced,
      ensSyncedAt: social.ensSyncedAt,
      ensTxHash: social.ensTxHash,
      canPrepareTransaction: false,
      reason: "ens_text_not_supported",
    };
  }

  if (currentValue === expectedValue) {
    const syncedSocial = social.ensSynced
      ? social
      : await markTelegramSocialEnsSynced({
        userId,
        handle: normalizedHandle,
        socialId: social.id,
        txHash: social.ensTxHash,
      });
    return {
      socialId: social.id,
      handle: normalizedHandle,
      ensName,
      key,
      expectedValue,
      currentValue,
      chainId: ensSyncChainId(),
      linkedWalletAddress,
      ownerAddress,
      resolverAddress,
      verified: true,
      ensSynced: true,
      ensSyncedAt: syncedSocial.ensSyncedAt,
      ensTxHash: syncedSocial.ensTxHash,
      canPrepareTransaction: false,
      reason: "already_synced",
    };
  }

  const walletMatchesOwner =
    getAddress(linkedWalletAddress).toLowerCase() === ownerAddress.toLowerCase();

  return {
    socialId: social.id,
    handle,
    ensName,
    key,
    expectedValue,
    currentValue,
    chainId: ensSyncChainId(),
    linkedWalletAddress,
    ownerAddress,
    resolverAddress,
    verified: true,
    ensSynced: social.ensSynced,
    ensSyncedAt: social.ensSyncedAt,
    ensTxHash: social.ensTxHash,
    canPrepareTransaction: walletMatchesOwner,
    reason: walletMatchesOwner ? "ready" : "ens_owner_wallet_mismatch",
  };
}

export async function prepareTelegramEnsTextSync({
  userId,
  handle,
  socialId,
}: {
  userId: string;
  handle: string;
  socialId: string;
}) {
  const status = await getTelegramEnsSyncStatus({ userId, handle, socialId });
  if (!status.ensName) throw new Error(status.reason);
  if (!status.canPrepareTransaction) throw new Error(status.reason);

  const prepared = await prepareEnsSetTextTransaction({
    name: status.ensName,
    key: status.key,
    value: status.expectedValue,
  });
  if (!prepared) throw new Error("ens_text_not_supported");

  return {
    status,
    transaction: prepared,
  };
}

export async function confirmTelegramEnsTextSync({
  userId,
  handle,
  socialId,
  txHash,
}: {
  userId: string;
  handle: string;
  socialId: string;
  txHash: string;
}) {
  if (!/^0x[a-fA-F0-9]{64}$/u.test(txHash.trim())) {
    throw new Error("invalid_transaction_hash");
  }

  const status = await getTelegramEnsSyncStatus({ userId, handle, socialId });
  if (!status.ensName) throw new Error(status.reason);
  if (!status.linkedWalletAddress || !status.ownerAddress || !status.resolverAddress) {
    throw new Error(status.reason);
  }

  const hash = txHash.trim() as EnsTxHash;
  const [transaction, receipt] = await Promise.all([
    getEnsTransaction(hash),
    waitForEnsTransactionReceipt(hash),
  ]);

  if (
    !transaction ||
    !isAddress(transaction.from) ||
    getAddress(transaction.from).toLowerCase() !==
      status.linkedWalletAddress.toLowerCase()
  ) {
    throw new Error("ens_transaction_sender_mismatch");
  }

  if (
    !transaction.to ||
    getAddress(transaction.to).toLowerCase() !== status.resolverAddress.toLowerCase()
  ) {
    throw new Error("ens_transaction_target_mismatch");
  }

  if (receipt.status !== "success") {
    throw new Error("ens_transaction_failed");
  }

  const refreshed = await getTelegramEnsSyncStatus({ userId, handle, socialId });
  if (refreshed.currentValue !== refreshed.expectedValue) {
    throw new Error("ens_text_mismatch");
  }

  const social = await markTelegramSocialEnsSynced({
    userId,
    handle,
    socialId,
    txHash: hash,
  });

  return {
    social,
    status: {
      ...refreshed,
      ensSynced: true,
      ensSyncedAt: social.ensSyncedAt,
      ensTxHash: social.ensTxHash,
      canPrepareTransaction: false,
      reason: "already_synced" as const,
    },
  };
}
