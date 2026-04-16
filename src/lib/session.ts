import crypto from "crypto";

type SessionPayload = {
  uid: string;
  phone: string;
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

function b64urlJson(obj: unknown) {
  return b64url(JSON.stringify(obj));
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
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function secret() {
  return process.env.NT_SESSION_SECRET || "dev_session_secret_change_me";
}

export function createSessionToken({
  uid,
  phone,
  ttlDays = 30,
}: {
  uid: string;
  phone: string;
  ttlDays?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid,
    phone,
    iat: now,
    exp: now + ttlDays * 24 * 60 * 60,
  };
  const body = b64urlJson(payload);
  const sig = sign(body, secret());
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, secret());
  if (!safeEqual(sig, expected)) return null;

  try {
    const payload = JSON.parse(fromB64url(body)) as SessionPayload;
    if (!payload?.uid || !payload?.phone) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

