import { NextResponse, type NextRequest } from "next/server";

import { verifySessionToken } from "@/lib/session";
import {
  createNotification,
  getClaimByUserId,
  getPaymentDestinationByHandle,
  getUserById,
  logApiUsage,
} from "@/lib/adminStore";
import { createPaylinkRecord, listPaylinksForOwner } from "@/lib/paylinks";
import { consumeRateLimit, getClientAddress } from "@/lib/rateLimit";

function normalizeSlug(input: string) {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed
    .replace(/[\s/]+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

function toKobo(value: number | undefined) {
  if (value == null) return undefined;
  const normalized = Math.round(Number(value));
  if (!Number.isFinite(normalized) || normalized <= 0) return undefined;
  return normalized * 100;
}

function normalizeExternalUrl(input?: string) {
  const trimmed = input?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const token = req.cookies.get("nt_session")?.value || "";
    const payload = token ? verifySessionToken(token) : null;
    if (!payload) {
      status = 401;
      return NextResponse.json(
        { error: "unauthorized" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "50"), 1), 100);
    const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);

    const items = await listPaylinksForOwner({ ownerId: payload.uid, limit, offset });
    status = 200;
    return NextResponse.json(
      { ok: true, items },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status = message === "database_not_configured" ? 503 : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    await logApiUsage({
      endpoint: "/api/paylinks",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => null);
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;
  let status = 200;

  try {
    const token = req.cookies.get("nt_session")?.value || "";
    const payload = token ? verifySessionToken(token) : null;
    if (!payload) {
      status = 401;
      return NextResponse.json(
        { error: "unauthorized" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | {
          slug?: string;
          linkType?: "standard" | "invoice" | "subscription" | "donation" | "event";
          title?: string;
          description?: string;
          logoUrl?: string;
          amountType?: "fixed" | "open" | "range" | "suggested";
          amount?: number;
          amountMin?: number;
          amountMax?: number;
          suggestedAmounts?: number[];
          collectEmail?: boolean;
          collectPhone?: boolean;
          collectName?: boolean;
          customFields?: unknown[];
          redirectUrl?: string;
          cancelUrl?: string;
          maxUses?: number;
          expiresAt?: string;
          feeBearer?: "recipient" | "payer";
          metadata?: Record<string, unknown>;
        }
      | null;

    const user = await getUserById(payload.uid);
    if (!user) {
      status = 401;
      return NextResponse.json(
        { error: "unauthorized" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const clientIp = getClientAddress(req);
    const [userLimit, ipLimit] = await Promise.all([
      consumeRateLimit({
        scope: "paylinks:create:user",
        identifier: payload.uid,
        limit: 12,
        windowMs: 60 * 60 * 1000,
      }),
      consumeRateLimit({
        scope: "paylinks:create:ip",
        identifier: clientIp,
        limit: 20,
        windowMs: 60 * 60 * 1000,
      }),
    ]);

    const limited = !userLimit.allowed ? userLimit : !ipLimit.allowed ? ipLimit : null;
    if (limited) {
      status = 429;
      return NextResponse.json(
        { error: "rate_limited" },
        {
          status,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(limited.retryAfterSec),
            "X-RateLimit-Remaining": String(limited.remaining),
          },
        }
      );
    }

    const claim = await getClaimByUserId(payload.uid);
    if (!claim) {
      status = 409;
      return NextResponse.json(
        { error: "missing_handle" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const slug = body?.slug ? normalizeSlug(body.slug) : "";
    const shortCode = slug ? `${claim.handle}/${slug}` : claim.handle;
    const linkType = body?.linkType ?? "standard";
    const amountType = body?.amountType ?? "open";
    const feeBearer = body?.feeBearer ?? "recipient";
    const maxUses =
      body?.maxUses == null
        ? undefined
        : Number.isFinite(Number(body.maxUses)) && Number(body.maxUses) > 0
          ? Math.floor(Number(body.maxUses))
          : undefined;

    const suggestedAmounts =
      Array.isArray(body?.suggestedAmounts) ? body!.suggestedAmounts : [];

    const amountKobo = toKobo(body?.amount);
    const amountMinKobo = toKobo(body?.amountMin);
    const amountMaxKobo = toKobo(body?.amountMax);
    const suggestedAmountsKobo = suggestedAmounts
      .map((value) => toKobo(value))
      .filter((value): value is number => typeof value === "number");

    if (amountType === "fixed" && !amountKobo) {
      status = 400;
      return NextResponse.json(
        { error: "invalid_amount" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (amountType === "range" && (!amountMinKobo || !amountMaxKobo || amountMinKobo > amountMaxKobo)) {
      status = 400;
      return NextResponse.json(
        { error: "invalid_amount_range" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (amountType === "suggested" && suggestedAmountsKobo.length === 0) {
      status = 400;
      return NextResponse.json(
        { error: "missing_suggested_amounts" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const payment = await getPaymentDestinationByHandle(claim.handle);
    const bankAccount = payment?.bankAccount ?? null;
    if (!bankAccount?.accountNumber) {
      status = 409;
      return NextResponse.json(
        { error: "bank_link_required" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const recipientName =
      bankAccount.accountName?.trim() ||
      claim.displayName.trim() ||
      user.fullName?.trim() ||
      "Pending verification";
    const recipientBankCode = (bankAccount.nipCode || bankAccount.bankCode).trim();
    const normalizedRedirectUrl = normalizeExternalUrl(body?.redirectUrl);
    const normalizedCancelUrl = normalizeExternalUrl(body?.cancelUrl);

    if (body?.redirectUrl && !normalizedRedirectUrl) {
      status = 400;
      return NextResponse.json(
        { error: "invalid_redirect_url" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (body?.cancelUrl && !normalizedCancelUrl) {
      status = 400;
      return NextResponse.json(
        { error: "invalid_cancel_url" },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const redirectUrl = normalizedRedirectUrl ?? undefined;
    const cancelUrl = normalizedCancelUrl ?? undefined;

    const record = await createPaylinkRecord({
      shortCode,
      handle: claim.handle,
      ownerId: payload.uid,
      linkType,
      title: body?.title?.trim() || undefined,
      description: body?.description?.trim() || undefined,
      logoUrl: body?.logoUrl?.trim() || undefined,
      amountType,
      amountKobo,
      amountMinKobo,
      amountMaxKobo,
      suggestedAmountsKobo,
      recipientName,
      recipientNuban: bankAccount.accountNumber.trim(),
      recipientBank: bankAccount.bankName.trim(),
      recipientBankCode,
      collectEmail: body?.collectEmail ?? true,
      collectPhone: body?.collectPhone ?? false,
      collectName: body?.collectName ?? true,
      customFields: Array.isArray(body?.customFields) ? body!.customFields : [],
      redirectUrl,
      cancelUrl,
      maxUses,
      expiresAt: body?.expiresAt?.trim() || undefined,
      feeBearer,
      platformFeeBps: 50,
      metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
      source: "dashboard",
    });

    await createNotification({
      userId: payload.uid,
      handle: claim.handle,
      type: "paylink_created",
      title: "PayLink created",
      body: `Your PayLink /pay/${record.shortCode} is live and ready to share.`,
      priority: "normal",
      metadata: {
        paylinkId: record.id,
        shortCode: record.shortCode,
        status: record.status,
      },
    }).catch(() => null);

    status = 201;
    return NextResponse.json(
      {
        ok: true,
        paylink: record,
        url: `/pay/${record.shortCode}`,
      },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    status =
      message === "database_not_configured"
        ? 503
        : message.includes("duplicate key") || message.includes("unique")
          ? 409
          : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    await logApiUsage({
      endpoint: "/api/paylinks",
      method: "POST",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    }).catch(() => null);
  }
}
