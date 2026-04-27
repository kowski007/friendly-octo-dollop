import QRCode from "qrcode";

export type QrFormat = "svg" | "png";

type QrOptions = {
  size?: number;
  margin?: number;
  dark?: string;
  light?: string;
};

const DEFAULT_QR_SIZE = 720;
const MIN_QR_SIZE = 160;
const MAX_QR_SIZE = 2048;
const DEFAULT_QR_MARGIN = 2;

function clampQrSize(size?: number) {
  if (!size || !Number.isFinite(size)) return DEFAULT_QR_SIZE;
  return Math.min(MAX_QR_SIZE, Math.max(MIN_QR_SIZE, Math.round(size)));
}

function clampQrMargin(margin?: number) {
  if (margin == null || !Number.isFinite(margin)) return DEFAULT_QR_MARGIN;
  return Math.min(8, Math.max(0, Math.round(margin)));
}

function qrRenderOptions(options?: QrOptions) {
  return {
    errorCorrectionLevel: "M" as const,
    width: clampQrSize(options?.size),
    margin: clampQrMargin(options?.margin),
    color: {
      dark: options?.dark || "#111111",
      light: options?.light || "#ffffff",
    },
  };
}

export function normalizeQrValue(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("qr_value_required");
  }
  if (normalized.length > 2048) {
    throw new Error("qr_value_too_long");
  }
  return normalized;
}

export async function createQrSvg(value: string, options?: QrOptions) {
  return QRCode.toString(normalizeQrValue(value), {
    type: "svg",
    ...qrRenderOptions(options),
  });
}

export async function createQrPngBuffer(value: string, options?: QrOptions) {
  const dataUrl = await QRCode.toDataURL(normalizeQrValue(value), {
    type: "image/png",
    ...qrRenderOptions(options),
  });
  const [, base64 = ""] = dataUrl.split(",", 2);
  return Buffer.from(base64, "base64");
}

export function qrDownloadName(label?: string | null, format: QrFormat = "svg") {
  const stem =
    label
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "nairatag-paylink";
  return `${stem}-qr.${format}`;
}

