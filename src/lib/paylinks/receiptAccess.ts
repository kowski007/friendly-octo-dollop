import crypto from "crypto";

type ReceiptAccessPayload = {
  paymentId: string;
  iat: number;
  exp: number;
};

function b64url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

function sign(input: string, secret: string) {
  return b64url(crypto.createHmac("sha256", secret).update(input).digest());
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function secret() {
  return (
    process.env.NT_RECEIPT_ACCESS_SECRET?.trim() ||
    process.env.NT_SESSION_SECRET?.trim() ||
    "dev_receipt_secret_change_me"
  );
}

export function createReceiptAccessToken({
  paymentId,
  ttlDays = 30,
}: {
  paymentId: string;
  ttlDays?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: ReceiptAccessPayload = {
    paymentId,
    iat: now,
    exp: now + ttlDays * 24 * 60 * 60,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body, secret());
  return `${body}.${sig}`;
}

export function verifyReceiptAccessToken(token: string, paymentId: string) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;

  const expected = sign(body, secret());
  if (!safeEqual(sig, expected)) return false;

  try {
    const payload = JSON.parse(fromB64url(body)) as ReceiptAccessPayload;
    const now = Math.floor(Date.now() / 1000);
    return Boolean(
      payload?.paymentId &&
        payload.paymentId === paymentId &&
        payload.exp &&
        payload.exp >= now
    );
  } catch {
    return false;
  }
}

