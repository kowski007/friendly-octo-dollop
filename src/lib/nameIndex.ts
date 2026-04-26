import nameIndexJson from "@/data/name-index.json";

export type NameCategory = "public" | "premium" | "protected" | "blocked";
export type NameIndexCurrency = "NGN" | "USD" | "USDC";
export type NameAvailabilityStatus =
  | "available"
  | "premium"
  | "protected"
  | "blocked"
  | "taken"
  | "invalid";

export interface NameIndexRecord {
  handle: string;
  category: NameCategory;
  badge?: string | null;
  price?: number | null;
  currency?: NameIndexCurrency | null;
  claimable: boolean;
  purchasable: boolean;
  requestable: boolean;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  owner_type?: string | null;
  id?: string | null;
  version?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface NameIndexOverrideRecord extends NameIndexRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface NameAvailabilityRecord extends NameIndexRecord {
  status: NameAvailabilityStatus;
  display_handle: string;
  message: string;
  taken: boolean;
  displayName?: string;
  bank?: string;
  verification?: "verified" | "business" | "pending";
}

type MarketplaceNameCategory = "premium" | "protected" | "blocked";
type OverrideCollection =
  | NameIndexOverrideRecord[]
  | Map<string, NameIndexOverrideRecord>;

const NAIRA = "\u20A6";
const rawIndex = nameIndexJson as NameIndexRecord[];

export function buildDefaultRecord(handle: string): NameIndexRecord {
  return {
    handle,
    category: "public",
    badge: null,
    price: null,
    currency: null,
    claimable: true,
    purchasable: false,
    requestable: false,
    reason: null,
    metadata: {},
  };
}

function normalizeRecord(record: NameIndexRecord): NameIndexRecord {
  const handle = normalizeHandle(record.handle);
  return {
    ...buildDefaultRecord(handle),
    ...record,
    handle,
    metadata: record.metadata ?? {},
  };
}

const normalizedRecords = rawIndex
  .map(normalizeRecord)
  .filter((record) => Boolean(record.handle));

const recordsByHandle = new Map(
  normalizedRecords.map((record) => [record.handle, record] as const)
);

function normalizeOverrideRecord(
  record: NameIndexOverrideRecord
): NameIndexOverrideRecord {
  const base = normalizeRecord(record);
  return {
    ...base,
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
  };
}

function resolveOverrideMap(overrides?: OverrideCollection) {
  if (!overrides) {
    return new Map<string, NameIndexOverrideRecord>();
  }

  if (overrides instanceof Map) {
    return new Map(
      Array.from(overrides.entries()).map(([handle, record]) => [
        handle,
        normalizeOverrideRecord(record),
      ])
    );
  }

  return new Map(
    overrides.map((record) => {
      const normalized = normalizeOverrideRecord(record);
      return [normalized.handle, normalized] as const;
    })
  );
}

export function mergeNameIndexRecord(
  baseRecord: NameIndexRecord,
  overrideRecord?: Partial<NameIndexRecord> | null
): NameIndexRecord {
  if (!overrideRecord) {
    return baseRecord;
  }

  const handle = normalizeHandle(overrideRecord.handle ?? baseRecord.handle);
  return normalizeRecord({
    ...baseRecord,
    ...overrideRecord,
    handle,
    metadata:
      overrideRecord.metadata !== undefined
        ? overrideRecord.metadata
        : baseRecord.metadata,
  });
}

export function getSeedNameIndexRecord(inputHandle: string): NameIndexRecord {
  const normalized = normalizeHandle(inputHandle);
  if (!normalized) {
    return buildDefaultRecord("");
  }

  return recordsByHandle.get(normalized) ?? buildDefaultRecord(normalized);
}

export function getSeedNameIndexRecordOrNull(inputHandle: string) {
  const normalized = normalizeHandle(inputHandle);
  if (!normalized) return null;
  return recordsByHandle.get(normalized) ?? null;
}

export function normalizeHandle(input: string) {
  return input
    .trim()
    .replace(/\s+/g, "")
    .replace(/^https?:\/\/t\.me\//iu, "")
    .replace(/^t\.me\//iu, "")
    .replace(/^\u20A6+/u, "")
    .replace(/^@+/u, "")
    .toLowerCase();
}

export function isValidHandle(handle: string) {
  return /^[a-z0-9_.]{2,32}$/u.test(handle);
}

export function displayHandle(handle: string) {
  const normalized = normalizeHandle(handle);
  return `${NAIRA}${normalized}`;
}

export function getNameIndexRecord(
  inputHandle: string,
  overrides?: OverrideCollection
): NameIndexRecord {
  const normalized = normalizeHandle(inputHandle);
  if (!normalized) {
    return buildDefaultRecord("");
  }

  const baseRecord = getSeedNameIndexRecord(normalized);
  const overrideRecord = resolveOverrideMap(overrides).get(normalized);
  return mergeNameIndexRecord(baseRecord, overrideRecord);
}

export function classifyIndexedHandleAvailability(
  inputHandle: string,
  options?: { isClaimed?: boolean; overrides?: OverrideCollection }
): NameAvailabilityRecord {
  const normalized = normalizeHandle(inputHandle);
  if (!normalized) {
    return {
      ...buildDefaultRecord(""),
      status: "invalid",
      display_handle: `${NAIRA}`,
      message: "Enter a handle to continue",
      taken: false,
    };
  }

  if (!isValidHandle(normalized)) {
    return {
      ...buildDefaultRecord(normalized),
      status: "invalid",
      display_handle: displayHandle(normalized),
      message: "Use letters, numbers, underscores, or periods only",
      taken: false,
    };
  }

  const record = getNameIndexRecord(normalized, options?.overrides);
  const claimed = Boolean(options?.isClaimed);

  if (record.category === "blocked") {
    return {
      ...record,
      status: "blocked",
      display_handle: displayHandle(normalized),
      message: "This name is not available",
      taken: claimed,
    };
  }

  if (record.category === "protected") {
    return {
      ...record,
      status: "protected",
      display_handle: displayHandle(normalized),
      message: record.reason
        ? `${displayHandle(normalized)} is reserved. ${record.reason}.`
        : `${displayHandle(normalized)} is reserved. You can request access if you represent this entity.`,
      taken: claimed,
    };
  }

  if (claimed) {
    return {
      ...record,
      status: "taken",
      display_handle: displayHandle(normalized),
      claimable: false,
      purchasable: false,
      requestable: false,
      message: `${displayHandle(normalized)} is already taken`,
      taken: true,
    };
  }

  if (record.category === "premium") {
    return {
      ...record,
      status: "premium",
      display_handle: displayHandle(normalized),
      message: `${displayHandle(normalized)} is a premium name`,
      taken: false,
    };
  }

  return {
    ...record,
    status: "available",
    display_handle: displayHandle(normalized),
    message: `${displayHandle(normalized)} is available`,
    taken: false,
  };
}

export function getMarketplaceNames(
  category?: MarketplaceNameCategory,
  options?: { q?: string; limit?: number; overrides?: OverrideCollection }
) {
  const query = normalizeHandle(options?.q ?? "");
  const limit = options?.limit && options.limit > 0 ? options.limit : undefined;
  const items = getAllIndexedNames(options?.overrides).filter((record) => {
    if (category && record.category !== category) return false;
    if (!query) return true;

    return (
      record.handle.includes(query) ||
      record.badge?.toLowerCase().includes(query) ||
      record.reason?.toLowerCase().includes(query) ||
      record.owner_type?.toLowerCase().includes(query)
    );
  });

  return {
    total: items.length,
    items: typeof limit === "number" ? items.slice(0, limit) : items,
  };
}

export function getNameIndexSummary(overrides?: OverrideCollection) {
  const records = getAllIndexedNames(overrides);
  const premium = records.filter((record) => record.category === "premium");
  const protectedNames = records.filter(
    (record) => record.category === "protected"
  );
  const blocked = records.filter((record) => record.category === "blocked");

  return {
    total: records.length,
    premium: premium.length,
    protected: protectedNames.length,
    blocked: blocked.length,
    public: records.filter((record) => record.category === "public").length,
  };
}

export function getAllIndexedNames(overrides?: OverrideCollection) {
  const merged = new Map(recordsByHandle);
  for (const [handle, overrideRecord] of resolveOverrideMap(overrides)) {
    const baseRecord = recordsByHandle.get(handle) ?? buildDefaultRecord(handle);
    merged.set(handle, mergeNameIndexRecord(baseRecord, overrideRecord));
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.handle.localeCompare(right.handle)
  );
}
