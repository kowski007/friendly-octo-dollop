import {
  FALLBACK_NIGERIAN_BANKS,
  type BankDirectoryEntry,
} from "./nigerianBanks";

type MonoLookupBanksResponse = {
  data?: Array<Record<string, unknown>>;
  message?: string;
};

type MonoLookupAccountResponse = {
  data?: Record<string, unknown> | null;
  message?: string;
};

type DirectoryResult = {
  banks: BankDirectoryEntry[];
  source: "mono" | "fallback";
  lookupEnabled: boolean;
  message?: string;
};

type AccountLookupResult =
  | {
      status: "verified";
      provider: "mono";
      accountName: string;
      message?: string;
    }
  | {
      status: "pending_lookup";
      provider: "mono" | "manual";
      message: string;
    }
  | {
      status: "failed";
      provider: "mono";
      message: string;
    };

function monoBaseUrl() {
  return (process.env.MONO_BASE_URL || "https://api.withmono.com/v3").replace(
    /\/+$/,
    ""
  );
}

function monoSecretKey() {
  return process.env.MONO_SECRET_KEY?.trim() || "";
}

function hasMonoCredentials() {
  return Boolean(monoSecretKey());
}

function monoHeaders() {
  return {
    accept: "application/json",
    "content-type": "application/json",
    "mono-sec-key": monoSecretKey(),
  };
}

function parseLookupMessage(
  payload: MonoLookupBanksResponse | MonoLookupAccountResponse | null,
  status: number
) {
  const message =
    (payload && typeof payload.message === "string" && payload.message.trim()) ||
    `mono_lookup_http_${status}`;

  if (/does not have access to lookup/i.test(message)) {
    return {
      code: "lookup_not_enabled" as const,
      message,
    };
  }

  return {
    code: "lookup_error" as const,
    message,
  };
}

function extractAccountName(payload: MonoLookupAccountResponse | null) {
  const data = payload?.data;
  if (!data || typeof data !== "object") return null;

  const direct =
    data.account_name ??
    data.name ??
    (typeof data.account === "object" && data.account
      ? (data.account as Record<string, unknown>).name
      : undefined);

  return typeof direct === "string" && direct.trim() ? direct.trim() : null;
}

function mapMonoBank(row: Record<string, unknown>): BankDirectoryEntry | null {
  const bankName = [row.name, row.bank_name, row.bank].find(
    (value) => typeof value === "string" && value.trim()
  );
  if (typeof bankName !== "string") return null;

  const bankCode = [row.code, row.bank_code, row.id, row.slug].find(
    (value) => typeof value === "string" && value.trim()
  );
  const nipCode = [row.nip_code, row.nipCode].find(
    (value) => typeof value === "string" && value.trim()
  );

  return {
    bankCode:
      typeof bankCode === "string" && bankCode.trim()
        ? bankCode.trim()
        : bankName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    bankName: bankName.trim(),
    nipCode: typeof nipCode === "string" ? nipCode.trim() : undefined,
    supportsLookup: Boolean(nipCode),
  };
}

export async function listBankDirectory(): Promise<DirectoryResult> {
  if (!hasMonoCredentials()) {
    return {
      banks: FALLBACK_NIGERIAN_BANKS,
      source: "fallback",
      lookupEnabled: false,
      message: "Mono credentials are not configured yet.",
    };
  }

  const response = await fetch(`${monoBaseUrl()}/lookup/banks`, {
    method: "GET",
    headers: monoHeaders(),
    cache: "no-store",
  });
  const payload = (await response
    .json()
    .catch(() => null)) as MonoLookupBanksResponse | null;

  if (!response.ok) {
    const parsed = parseLookupMessage(payload, response.status);
    return {
      banks: FALLBACK_NIGERIAN_BANKS,
      source: "fallback",
      lookupEnabled: false,
      message: parsed.message,
    };
  }

  const rawRows = Array.isArray(payload?.data) ? payload.data : [];
  const banks = rawRows
    .map((row) =>
      row && typeof row === "object"
        ? mapMonoBank(row as Record<string, unknown>)
        : null
    )
    .filter((row): row is BankDirectoryEntry => Boolean(row))
    .sort((a, b) => a.bankName.localeCompare(b.bankName));

  return {
    banks: banks.length > 0 ? banks : FALLBACK_NIGERIAN_BANKS,
    source: banks.length > 0 ? "mono" : "fallback",
    lookupEnabled: banks.length > 0,
    message:
      banks.length > 0 ? undefined : "Mono bank list was empty. Using fallback.",
  };
}

export async function lookupBankAccount({
  accountNumber,
  nipCode,
}: {
  accountNumber: string;
  nipCode?: string;
}): Promise<AccountLookupResult> {
  const normalizedAccountNumber = accountNumber.replace(/\D/g, "");
  const normalizedNipCode = nipCode?.trim();

  if (!/^\d{10}$/.test(normalizedAccountNumber)) {
    return {
      status: "failed",
      provider: "mono",
      message: "Account numbers must be 10 digits.",
    };
  }

  if (!normalizedNipCode) {
    return {
      status: "pending_lookup",
      provider: "manual",
      message: "Bank saved, but lookup is waiting for a provider bank code.",
    };
  }

  if (!hasMonoCredentials()) {
    return {
      status: "pending_lookup",
      provider: "manual",
      message: "Bank saved, but Mono credentials are not configured yet.",
    };
  }

  const response = await fetch(`${monoBaseUrl()}/lookup/account-number`, {
    method: "POST",
    headers: monoHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      account_number: normalizedAccountNumber,
      nip_code: normalizedNipCode,
    }),
  });
  const payload = (await response
    .json()
    .catch(() => null)) as MonoLookupAccountResponse | null;

  if (!response.ok) {
    const parsed = parseLookupMessage(payload, response.status);
    if (parsed.code === "lookup_not_enabled") {
      return {
        status: "pending_lookup",
        provider: "mono",
        message: parsed.message,
      };
    }

    return {
      status: "failed",
      provider: "mono",
      message: parsed.message,
    };
  }

  const accountName = extractAccountName(payload);
  if (!accountName) {
    return {
      status: "failed",
      provider: "mono",
      message: "Mono lookup succeeded but did not return an account name.",
    };
  }

  return {
    status: "verified",
    provider: "mono",
    accountName,
    message:
      typeof payload?.message === "string" ? payload.message.trim() : undefined,
  };
}
