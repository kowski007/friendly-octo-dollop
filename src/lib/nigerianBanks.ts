export type BankDirectoryEntry = {
  bankCode: string;
  bankName: string;
  nipCode?: string;
  supportsLookup: boolean;
};

export const FALLBACK_NIGERIAN_BANKS: BankDirectoryEntry[] = [
  { bankCode: "access-bank", bankName: "Access Bank", supportsLookup: false },
  { bankCode: "citibank-ng", bankName: "Citibank Nigeria", supportsLookup: false },
  { bankCode: "ecobank", bankName: "Ecobank Nigeria", supportsLookup: false },
  { bankCode: "fcmb", bankName: "First City Monument Bank", supportsLookup: false },
  { bankCode: "fidelity", bankName: "Fidelity Bank", supportsLookup: false },
  { bankCode: "first-bank", bankName: "First Bank", supportsLookup: false },
  { bankCode: "gtbank", bankName: "Guaranty Trust Bank", supportsLookup: false },
  { bankCode: "keystone", bankName: "Keystone Bank", supportsLookup: false },
  { bankCode: "moniepoint", bankName: "Moniepoint MFB", supportsLookup: false },
  { bankCode: "opay", bankName: "OPay", supportsLookup: false },
  { bankCode: "palmpay", bankName: "PalmPay", supportsLookup: false },
  { bankCode: "polaris", bankName: "Polaris Bank", supportsLookup: false },
  { bankCode: "providus", bankName: "Providus Bank", supportsLookup: false },
  { bankCode: "stanbic-ibtc", bankName: "Stanbic IBTC Bank", supportsLookup: false },
  { bankCode: "sterling", bankName: "Sterling Bank", supportsLookup: false },
  { bankCode: "uba", bankName: "UBA", supportsLookup: false },
  { bankCode: "union-bank", bankName: "Union Bank", supportsLookup: false },
  { bankCode: "wema", bankName: "Wema Bank", supportsLookup: false },
  { bankCode: "zenith", bankName: "Zenith Bank", supportsLookup: false },
];

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function findFallbackBank(input: string) {
  const key = normalizeKey(input);
  return (
    FALLBACK_NIGERIAN_BANKS.find(
      (bank) =>
        bank.bankCode === key ||
        normalizeKey(bank.bankName) === key ||
        (bank.nipCode && bank.nipCode === input.trim())
    ) ?? null
  );
}
