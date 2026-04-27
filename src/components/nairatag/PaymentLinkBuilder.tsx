"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import type { BankAccountRecord, ClaimRecord, UserRecord } from "@/lib/adminTypes";
import type {
  PaylinkPaymentRecord,
  PaylinkRecord,
  PaylinkSettlementRecord,
  PaylinksDashboardData,
} from "@/lib/paylinks";
import { AuthModalButton } from "@/components/auth/AuthModalButton";
import { AppPageHeader } from "./AppPageHeader";
import { CopyButton } from "./CopyButton";
import { HandleIdentity } from "./HandleTrust";
import { PaylinkQrCard } from "./PaylinkQrCard";
import { useToast } from "./ToastProvider";
import { Badge, Card, Container } from "./ui";

const NAIRA = "\u20A6";

type MeResponse =
  | {
      ok: true;
      user: UserRecord;
      claim: ClaimRecord | null;
      bankAccount: BankAccountRecord | null;
    }
  | { error: string };

type DashboardResponse = ({ ok: true } & PaylinksDashboardData) | { error: string };

function currencyFromKobo(kobo?: number | null) {
  if (!kobo) return "NGN 0";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Math.round(kobo / 100));
}

function dateLabel(value?: string) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

function statusTone(status: string) {
  if (
    status === "active" ||
    status === "paid" ||
    status === "successful" ||
    status === "verified"
  ) {
    return "verify" as const;
  }
  if (
    status === "paused" ||
    status === "queued" ||
    status === "processing" ||
    status === "refunded"
  ) {
    return "neutral" as const;
  }
  return "orange" as const;
}

function buildWhatsAppShare(url: string, title: string) {
  return `https://wa.me/?text=${encodeURIComponent(`Pay me with my NairaTag link: ${title} ${url}`)}`;
}

function buildTelegramShare(url: string, title: string) {
  const params = new URLSearchParams({
    url,
    text: `Pay me with my NairaTag link: ${title}`,
  });
  return `https://t.me/share/url?${params.toString()}`;
}

export function PaymentLinkBuilder({
  mode = "dashboard",
}: {
  mode?: "create" | "dashboard";
}) {
  const { toast } = useToast();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [amountType, setAmountType] = useState<"fixed" | "open" | "range" | "suggested">(
    "open"
  );
  const [amount, setAmount] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [suggestedAmounts, setSuggestedAmounts] = useState("2000,5000,10000");
  const [feeBearer, setFeeBearer] = useState<"recipient" | "payer">("recipient");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [cancelUrl, setCancelUrl] = useState("");
  const [createdLinkUrl, setCreatedLinkUrl] = useState("");
  const [createdLinkTitle, setCreatedLinkTitle] = useState("");

  const isCreateMode = mode === "create";

  async function loadData() {
    const [meRes, dashRes] = await Promise.all([
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/paylinks/dashboard", { cache: "no-store" }),
    ]);

    const meJson = (await meRes.json().catch(() => null)) as MeResponse | null;
    const dashJson = (await dashRes.json().catch(() => null)) as DashboardResponse | null;
    setMe(meJson);
    setDashboard(dashJson);
  }

  useEffect(() => {
    setOrigin(window.location.origin);

    let cancelled = false;
    async function run() {
      try {
        await loadData();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const claim = me && "ok" in me ? me.claim : null;
  const bankAccount = me && "ok" in me ? me.bankAccount : null;
  const isSignedIn = Boolean(me && "ok" in me);
  const paylinks = dashboard && "ok" in dashboard ? dashboard.paylinks : [];
  const payments = dashboard && "ok" in dashboard ? dashboard.payments : [];
  const settlements = dashboard && "ok" in dashboard ? dashboard.settlements : [];
  const summary = dashboard && "ok" in dashboard ? dashboard.summary : null;

  const recentPaylinks = paylinks.slice(0, 3);
  const recentPayments = payments.slice(0, 4);
  const recentSettlements = settlements.slice(0, 4);
  const needsSetup = !claim || !bankAccount;

  const previewShortCode = useMemo(() => {
    if (!claim) return "";
    const cleanSlug = slugify(slug || title);
    return cleanSlug ? `${claim.handle}/${cleanSlug}` : claim.handle;
  }, [claim, slug, title]);

  const previewUrl = previewShortCode ? `${origin}/pay/${previewShortCode}` : "";

  function resetForm() {
    setTitle("");
    setSlug("");
    setDescription("");
    setAmountType("open");
    setAmount("");
    setAmountMin("");
    setAmountMax("");
    setSuggestedAmounts("2000,5000,10000");
    setFeeBearer("recipient");
    setRedirectUrl("");
    setCancelUrl("");
  }

  function showWarning(titleText: string, descriptionText: string) {
    setError(descriptionText);
    toast({
      title: titleText,
      description: descriptionText,
      tone: "warning",
    });
  }

  function createPaylink() {
    setStatus("");
    setError("");

    if (!claim) {
      showWarning("Claim required", `Claim a ${NAIRA}handle before creating a PayLink.`);
      return;
    }

    if (!bankAccount) {
      showWarning(
        "Bank link required",
        "Link a payout bank account before creating a PayLink."
      );
      return;
    }

    const cleanSlug = slugify(slug || title);
    if (!cleanSlug) {
      showWarning("Title required", "Add a title so we can create the link.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/paylinks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
          body: JSON.stringify({
            slug: cleanSlug,
            title: title.trim() || undefined,
            description: description.trim() || undefined,
            amountType,
            amount: amount ? Number(amount) : undefined,
            amountMin: amountMin ? Number(amountMin) : undefined,
            amountMax: amountMax ? Number(amountMax) : undefined,
            suggestedAmounts:
              amountType === "suggested"
                ? suggestedAmounts
                    .split(",")
                    .map((item) => Number(item.trim()))
                    .filter((value) => Number.isFinite(value) && value > 0)
                : undefined,
            feeBearer,
            redirectUrl: redirectUrl.trim() || undefined,
            cancelUrl: cancelUrl.trim() || undefined,
          }),
        });

        const body = (await response.json().catch(() => null)) as
          | { error?: string; url?: string }
          | null;

        if (!response.ok) {
          throw new Error(body?.error || "paylink_create_failed");
        }

        await loadData();
        const nextUrl = body?.url || `${origin}/pay/${previewShortCode}`;
        const nextTitle = title.trim() || `${NAIRA}${previewShortCode}`;
        resetForm();
        setCreatedLinkUrl(nextUrl);
        setCreatedLinkTitle(nextTitle);
        const message = `PayLink created at ${nextUrl}`;
        setStatus(message);
        toast({
          title: "PayLink created",
          description: message,
          tone: "success",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message.replace(/_/g, " ") : "Unable to create PayLink.";
        setError(message);
        toast({
          title: "PayLink creation failed",
          description: message,
          tone: "error",
        });
      }
    });
  }

  function refundPayment(paymentId: string) {
    setStatus("");
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/paylinks/payments/${paymentId}/refund`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
          body: JSON.stringify({
            reason: "Customer requested refund",
          }),
        });

        const body = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(body?.error || "refund_failed");
        }

        await loadData();
        const message = "Refund initiated and recorded on this payment.";
        setStatus(message);
        toast({
          title: "Refund started",
          description: message,
          tone: "success",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message.replace(/_/g, " ") : "Unable to start refund.";
        setError(message);
        toast({
          title: "Refund failed",
          description: message,
          tone: "error",
        });
      }
    });
  }

  function updateStatus(paylinkId: string, nextStatus: "active" | "paused" | "deleted") {
    setStatus("");
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/paylinks/${paylinkId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
          body: JSON.stringify({ status: nextStatus }),
        });

        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(body?.error || "paylink_update_failed");
        }

        await loadData();
        const message = `PayLink ${nextStatus}.`;
        setStatus(message);
        toast({
          title: "PayLink updated",
          description: message,
          tone: "success",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message.replace(/_/g, " ") : "Unable to update PayLink.";
        setError(message);
        toast({
          title: "PayLink update failed",
          description: message,
          tone: "error",
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader
        ctaHref={isCreateMode ? "/dashboard/paylinks" : "/pay/create"}
        ctaLabel={isCreateMode ? "Dashboard" : "Create link"}
      />

      <main className="py-6 sm:py-10">
        <Container className="space-y-5 sm:space-y-8">
          <div className="space-y-2">
            {!isCreateMode ? <Badge tone="neutral">Saved PayLinks</Badge> : null}
            <div className="max-w-3xl">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                {isCreateMode ? "Create PayLink" : "Create a hosted pay link."}
              </h1>
              <p className="mt-1.5 text-sm leading-5 text-zinc-600 dark:text-zinc-300 sm:mt-2 sm:text-base sm:leading-6">
                {isCreateMode
                  ? "One link. Copy it. Share it."
                  : "Share one link, route payers through Flutterwave checkout, and track receipts and settlements here."}
              </p>
            </div>
          </div>

          {loading ? (
            <Card className="p-4 sm:p-6">
              <div className="text-sm font-semibold">Loading PayLink workspace...</div>
            </Card>
          ) : !isCreateMode && (!me || !("ok" in me)) ? (
            <Card className="p-4 sm:p-6">
              <div className="space-y-3">
                <Badge tone="orange">Sign in required</Badge>
                <div className="text-2xl font-semibold tracking-tight">
                  Sign in to create your PayLink.
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  Sign in, claim a {NAIRA}handle, and publish a payment link from your identity.
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/dashboard"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white"
                  >
                    Open dashboard
                  </Link>
                  <Link
                    href="/claim"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200/80 px-4 text-sm font-semibold dark:border-zinc-800/80"
                  >
                    Claim your {NAIRA}handle
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <>
              {isSignedIn && !claim ? (
                <Card className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="orange">Claim required</Badge>
                    {!isCreateMode ? <Badge tone="neutral">Before PayLinks</Badge> : null}
                  </div>
                  <div className="mt-4 max-w-2xl">
                    <div className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      Claim a {NAIRA}handle first.
                    </div>
                    <div className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      Your saved PayLink needs a public NairaTag identity and a payout route behind
                      it.
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/claim"
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      Claim your {NAIRA}handle
                    </Link>
                    <Link
                      href="/dashboard"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200/80 px-4 text-sm font-semibold dark:border-zinc-800/80"
                    >
                      Open dashboard
                    </Link>
                  </div>
                </Card>
              ) : null}

              {isCreateMode ? (
                <Card className="p-3.5 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {isSignedIn ? (
                        <>
                          {claim ? (
                            <Badge tone="verify" className="px-2 py-1 text-[10px] sm:px-2.5 sm:text-[11px]">
                              {NAIRA}
                              {claim.handle} linked
                            </Badge>
                          ) : (
                            <Badge tone="orange" className="px-2 py-1 text-[10px] sm:px-2.5 sm:text-[11px]">
                              {NAIRA}handle missing
                            </Badge>
                          )}
                          <Badge
                            tone={bankAccount ? "verify" : "orange"}
                            className="px-2 py-1 text-[10px] sm:px-2.5 sm:text-[11px]"
                          >
                            {bankAccount ? "Bank linked" : "Bank missing"}
                          </Badge>
                        </>
                      ) : (
                        <Badge tone="orange" className="px-2 py-1 text-[10px] sm:px-2.5 sm:text-[11px]">
                          Sign in to publish
                        </Badge>
                      )}
                      <Badge tone="neutral" className="px-2 py-1 text-[10px] sm:px-2.5 sm:text-[11px]">
                        Flutterwave ready
                      </Badge>
                    </div>
                    {!isSignedIn ? (
                      <AuthModalButton
                        afterAuthHref="/pay/create"
                        variant="primary"
                        className="h-8 rounded-lg px-3 text-[11px] sm:h-9 sm:text-xs"
                      >
                        Continue with sign in
                      </AuthModalButton>
                    ) : needsSetup ? (
                      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        {!claim ? (
                          <Link
                            href="/claim"
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-nt-orange px-3 text-[11px] font-semibold text-white sm:h-9 sm:text-xs"
                          >
                            Claim handle
                          </Link>
                        ) : null}
                        {!bankAccount ? (
                          <Link
                            href="/settings"
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200/80 px-3 text-[11px] font-semibold dark:border-zinc-800/80 sm:h-9 sm:text-xs"
                          >
                            Link bank
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </Card>
              ) : null}

              {!isCreateMode ? (
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {claim ? (
                      <HandleIdentity handle={claim.handle} verification={claim.verification} size="sm" />
                    ) : (
                      <Badge tone="orange">No {NAIRA}handle</Badge>
                    )}
                    <Badge tone={bankAccount ? "verify" : "orange"}>
                      {bankAccount ? bankAccount.bankName : "Bank link required"}
                    </Badge>
                    <Badge tone="neutral">Flutterwave</Badge>
                    <Badge tone="neutral">{summary?.activePaylinks ?? 0} links</Badge>
                    <Badge tone="neutral">{summary?.successfulPayments ?? 0} paid</Badge>
                    <Badge tone="neutral">{currencyFromKobo(summary?.grossVolumeKobo)} gross</Badge>
                    <Badge tone="neutral">
                      {currencyFromKobo(summary?.outstandingSettlementsKobo)} pending
                    </Badge>
                  </div>
                </Card>
              ) : null}

              <div
                className={
                  isCreateMode
                    ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]"
                    : "grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"
                }
              >
                <Card className={isCreateMode ? "p-4 sm:p-6" : "p-6"}>
                  <div className={isCreateMode ? "mt-0.5" : "mt-1"}>
                    <div className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-xl">
                      {isCreateMode ? "New link" : "New PayLink"}
                    </div>
                    {!isCreateMode ? (
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        Title, slug, amount rules, then publish.
                      </div>
                    ) : null}
                  </div>

                  <div className={isCreateMode ? "mt-4 grid gap-3.5 sm:gap-4" : "mt-5 grid gap-4"}>
                    <label className="block">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        Title
                      </div>
                      <input
                        value={title}
                        onChange={(event) => {
                          const next = event.target.value;
                          setTitle(next);
                          if (!slug) setSlug(slugify(next));
                        }}
                        placeholder="Birthday money, event RSVP, invoice..."
                        className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3.5 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50 sm:mt-2 sm:h-12 sm:px-4"
                      />
                    </label>

                    <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
                      <label className="block">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                          Amount type
                        </div>
                        <select
                          value={amountType}
                          onChange={(event) =>
                            setAmountType(
                              event.target.value as "fixed" | "open" | "range" | "suggested"
                            )
                          }
                          className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3.5 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50 sm:mt-2 sm:h-12 sm:px-4"
                        >
                          <option value="open">Open amount</option>
                          <option value="fixed">Fixed amount</option>
                          {!isCreateMode ? <option value="range">Range</option> : null}
                          {!isCreateMode ? (
                            <option value="suggested">Suggested amounts</option>
                          ) : null}
                        </select>
                      </label>

                      {!isCreateMode ? (
                        <label className="block">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                            Payer fee
                          </div>
                          <select
                            value={feeBearer}
                            onChange={(event) =>
                              setFeeBearer(event.target.value as "recipient" | "payer")
                            }
                            className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3.5 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50 sm:mt-2 sm:h-12 sm:px-4"
                          >
                            <option value="recipient">Recipient absorbs fee</option>
                            <option value="payer">Payer absorbs fee</option>
                          </select>
                        </label>
                      ) : null}
                    </div>

                    <label className="block">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        {isCreateMode ? "Note" : "Description"}
                      </div>
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={isCreateMode ? 2 : 3}
                        placeholder={
                          isCreateMode
                            ? "Optional note"
                            : "Optional note for whoever opens the link."
                        }
                        className="mt-1.5 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3.5 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50 sm:mt-2 sm:px-4 sm:py-3"
                      />
                    </label>

                    {amountType === "fixed" ? (
                      <label className="block">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                          Fixed amount
                        </div>
                        <input
                          value={amount}
                          onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
                          inputMode="numeric"
                          placeholder="5000"
                          className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3.5 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50 sm:mt-2 sm:h-12 sm:px-4"
                        />
                      </label>
                    ) : null}

                    {!isCreateMode && amountType === "range" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                            Minimum
                          </div>
                          <input
                            value={amountMin}
                            onChange={(event) => setAmountMin(event.target.value.replace(/[^\d]/g, ""))}
                            inputMode="numeric"
                            placeholder="5000"
                            className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                          />
                        </label>
                        <label className="block">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                            Maximum
                          </div>
                          <input
                            value={amountMax}
                            onChange={(event) => setAmountMax(event.target.value.replace(/[^\d]/g, ""))}
                            inputMode="numeric"
                            placeholder="50000"
                            className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                          />
                        </label>
                      </div>
                    ) : null}

                    {!isCreateMode && amountType === "suggested" ? (
                      <label className="block">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                          Suggested amounts
                        </div>
                        <input
                          value={suggestedAmounts}
                          onChange={(event) => setSuggestedAmounts(event.target.value)}
                          placeholder="2000,5000,10000"
                          className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                        />
                      </label>
                    ) : null}

                    <details className="rounded-[1.15rem] border border-zinc-200/70 bg-zinc-50/80 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/35 sm:rounded-[1.25rem] sm:p-4">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {isCreateMode ? "Customize link" : "Advanced settings"}
                      </summary>
                      <div className="mt-3 grid gap-3.5 sm:mt-4 sm:gap-4">
                        <label className="block">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                            Link path
                          </div>
                          <div className="mt-1.5 flex h-11 items-center rounded-xl border border-zinc-200/80 bg-white/85 dark:border-zinc-800/80 dark:bg-zinc-950/40 sm:mt-2 sm:h-12">
                            <div className="px-3.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 sm:px-4">
                              /pay/{claim?.handle || "handle"}/
                            </div>
                            <input
                              value={slug}
                              onChange={(event) => setSlug(slugify(event.target.value))}
                              placeholder="creator-session"
                              className="min-w-0 flex-1 bg-transparent pr-3.5 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 sm:pr-4"
                            />
                          </div>
                        </label>

                        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
                          <label className="block">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                              Payer fee
                            </div>
                            <select
                              value={feeBearer}
                              onChange={(event) =>
                                setFeeBearer(event.target.value as "recipient" | "payer")
                              }
                              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3.5 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50 sm:mt-2 sm:h-12 sm:px-4"
                            >
                              <option value="recipient">Recipient absorbs fee</option>
                              <option value="payer">Payer absorbs fee</option>
                            </select>
                          </label>

                          <label className="block">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                              Success redirect URL
                            </div>
                            <input
                              value={redirectUrl}
                              onChange={(event) => setRedirectUrl(event.target.value)}
                              inputMode="url"
                              placeholder="https://merchant.app/payments/success"
                              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3.5 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50 sm:mt-2 sm:h-12 sm:px-4"
                            />
                          </label>

                          <label className="block">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                              Cancel redirect URL
                            </div>
                            <input
                              value={cancelUrl}
                              onChange={(event) => setCancelUrl(event.target.value)}
                              inputMode="url"
                              placeholder="https://merchant.app/payments/cancelled"
                              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3.5 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50 sm:mt-2 sm:h-12 sm:px-4"
                            />
                          </label>
                        </div>
                      </div>
                    </details>

                    {status ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                        {status}
                      </div>
                    ) : null}
                    {error ? (
                      <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
                        {error}
                      </div>
                    ) : null}

                    {!isSignedIn && isCreateMode ? (
                      <AuthModalButton
                        afterAuthHref="/pay/create"
                        variant="primary"
                        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white transition hover:brightness-110 sm:h-12"
                      >
                        Create PayLink
                      </AuthModalButton>
                    ) : (
                      <button
                        type="button"
                        onClick={createPaylink}
                        disabled={isPending || needsSetup}
                        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12"
                      >
                        {isPending
                          ? "Creating..."
                          : isCreateMode
                            ? "Create PayLink"
                            : "Create saved PayLink"}
                      </button>
                    )}
                  </div>
                </Card>

                <div className={isCreateMode ? "space-y-4 sm:space-y-6" : "space-y-6"}>
                  {!isCreateMode ? (
                    <Card className="p-5">
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Setup
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                          <span>{NAIRA}handle</span>
                          {claim ? (
                            <HandleIdentity handle={claim.handle} verification={claim.verification} size="sm" />
                          ) : (
                            <Badge tone="orange">Missing</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                          <span>Bank destination</span>
                          <Badge tone={bankAccount ? "verify" : "orange"}>
                            {bankAccount ? bankAccount.bankName : "Link required"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                          <span>Processor</span>
                          <Badge tone="neutral">Flutterwave</Badge>
                        </div>
                      </div>
                    </Card>
                  ) : null}

                  <Card className={isCreateMode ? "p-4 sm:p-5" : "p-5"}>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {isCreateMode ? "Preview" : "Link preview"}
                    </div>
                    {isCreateMode && claim ? (
                      <div className="mt-2.5 sm:mt-3">
                        <HandleIdentity handle={claim.handle} verification={claim.verification} size="sm" />
                      </div>
                    ) : null}
                    <div className="mt-2.5 rounded-[1.05rem] border border-zinc-200/70 bg-zinc-50 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/35 sm:mt-3 sm:rounded-[1.2rem] sm:p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        Public URL
                      </div>
                      <div className="mt-2 break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">
                        {previewUrl || "Add a title to preview the link."}
                      </div>
                    </div>

                    {isCreateMode && previewUrl ? (
                      <div className="mt-3">
                        <PaylinkQrCard
                          value={previewUrl}
                          title={title.trim() || `Pay ${NAIRA}${claim?.handle || "handle"}`}
                          subtitle="Scan this preview while you build."
                          compact
                          showDownloads={false}
                        />
                      </div>
                    ) : null}

                    {recentPaylinks.length > 0 ? (
                      <div className="mt-3.5 space-y-2.5 sm:mt-4 sm:space-y-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                          {isCreateMode ? "Recent" : "Recent links"}
                        </div>
                        {recentPaylinks.map((item: PaylinkRecord) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-zinc-200/70 bg-zinc-50 px-3.5 py-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/35 sm:px-4 sm:py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                  {item.title || `${NAIRA}${item.shortCode}`}
                                </div>
                                <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                  /pay/{item.shortCode}
                                </div>
                              </div>
                              <CopyButton
                                value={`${origin}/pay/${item.shortCode}`}
                                label="Copy"
                                copiedLabel="Copied"
                                className="h-8 rounded-lg px-2.5 py-0 text-[11px]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Card>

                  {!isCreateMode ? (
                    <Card className="p-6">
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Latest payments
                      </div>
                      <div className="mt-4 space-y-3">
                        {recentPayments.length === 0 ? (
                          <div className="text-sm text-zinc-600 dark:text-zinc-300">
                            No PayLink payments yet.
                          </div>
                        ) : (
                          recentPayments.map((payment: PaylinkPaymentRecord) => (
                            <div
                              key={payment.id}
                              className="rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                    {currencyFromKobo(payment.amountKobo)}
                                  </div>
                                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    {payment.paylinkShortCode} - {payment.payerEmail}
                                  </div>
                                </div>
                                <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Link
                                  href={`/payments/receipts/${payment.id}`}
                                  className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                  Open receipt
                                </Link>
                                {payment.status === "paid" ? (
                                  <button
                                    type="button"
                                    onClick={() => refundPayment(payment.id)}
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-orange-200/80 px-3 text-xs font-semibold text-orange-700 transition hover:bg-orange-50 dark:border-orange-900/60 dark:text-orange-200 dark:hover:bg-orange-950/20"
                                  >
                                    Refund
                                  </button>
                                ) : null}
                                <span className="inline-flex items-center text-xs text-zinc-500 dark:text-zinc-400">
                                  {dateLabel(payment.createdAt)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  ) : null}
                </div>
              </div>

              {isCreateMode && createdLinkUrl ? (
                <Card className="p-4 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="verify">Your PayLink is live</Badge>
                    <Badge tone="neutral">Copy, share, or print it</Badge>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[18rem,minmax(0,1fr)] lg:items-start">
                    <PaylinkQrCard
                      value={createdLinkUrl}
                      title={createdLinkTitle || "New PayLink"}
                      subtitle="Scan, print, or share this code anywhere."
                    />

                    <div>
                      <div className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                        {createdLinkTitle || "New PayLink"}
                      </div>
                      <div className="mt-2 break-all rounded-xl border border-zinc-200/70 bg-zinc-50 px-3.5 py-2.5 font-mono text-sm text-zinc-900 dark:border-zinc-800/80 dark:bg-zinc-900/35 dark:text-zinc-100 sm:px-4 sm:py-3">
                        {createdLinkUrl}
                      </div>
                      <div className="mt-4 grid gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
                        <CopyButton
                          value={createdLinkUrl}
                          label="Copy link"
                          copiedLabel="Copied"
                          className="h-9 rounded-xl px-3.5 py-0 text-sm sm:h-10 sm:px-4"
                        />
                        <Link
                          href={createdLinkUrl}
                          target="_blank"
                          className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 sm:h-10 sm:px-4"
                        >
                          Open link
                        </Link>
                        <Link
                          href={buildWhatsAppShare(createdLinkUrl, createdLinkTitle || "PayLink")}
                          target="_blank"
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200/80 px-3.5 text-sm font-semibold dark:border-zinc-800/80 sm:h-10 sm:px-4"
                        >
                          Share on WhatsApp
                        </Link>
                        <Link
                          href={buildTelegramShare(createdLinkUrl, createdLinkTitle || "PayLink")}
                          target="_blank"
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200/80 px-3.5 text-sm font-semibold dark:border-zinc-800/80 sm:h-10 sm:px-4"
                        >
                          Share on Telegram
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : null}

              {!isCreateMode ? (
                <>
                  <Card className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          Saved PayLinks
                        </div>
                        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                          Manage live links without losing payment history.
                        </div>
                      </div>
                      <Badge tone="neutral">{paylinks.length} total</Badge>
                    </div>

                    <div className="mt-5 grid gap-4">
                      {paylinks.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-zinc-300/70 px-4 py-8 text-sm text-zinc-600 dark:border-zinc-700/80 dark:text-zinc-300">
                          Your first saved PayLink will appear here.
                        </div>
                      ) : (
                        paylinks.map((item: PaylinkRecord) => (
                          <div
                            key={item.id}
                            className="rounded-[1.4rem] border border-zinc-200/70 bg-zinc-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/35"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                                  <Badge tone="neutral">{item.amountType}</Badge>
                                  <Badge tone="neutral">{item.feeBearer}</Badge>
                                </div>
                                <div className="mt-3 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                                  {item.title || `${NAIRA}${item.shortCode}`}
                                </div>
                                <div className="mt-1 break-all text-sm text-zinc-600 dark:text-zinc-300">
                                  {origin}/pay/{item.shortCode}
                                </div>
                                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                  Created {dateLabel(item.createdAt)} - {item.useCount} successful payments
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <CopyButton
                                  value={`${origin}/pay/${item.shortCode}`}
                                  label="Copy link"
                                  copiedLabel="Link copied"
                                  className="h-9 rounded-xl px-3 py-0 text-xs"
                                />
                                <Link
                                  href={`/pay/${item.shortCode}`}
                                  className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                  Open
                                </Link>
                                {item.status === "active" ? (
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(item.id, "paused")}
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200/80 px-3 text-xs font-semibold dark:border-zinc-800/80"
                                  >
                                    Pause
                                  </button>
                                ) : item.status === "paused" ? (
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(item.id, "active")}
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200/80 px-3 text-xs font-semibold dark:border-zinc-800/80"
                                  >
                                    Resume
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => updateStatus(item.id, "deleted")}
                                  className="inline-flex h-9 items-center justify-center rounded-xl border border-orange-200/80 px-3 text-xs font-semibold text-orange-700 dark:border-orange-900/60 dark:text-orange-200"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          Activity
                        </div>
                        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                          Recent payments and settlement movement.
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{payments.length} payments</Badge>
                        <Badge tone="neutral">{settlements.length} settlements</Badge>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-6 xl:grid-cols-2">
                      <div className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                          Payments
                        </div>
                        {recentPayments.length === 0 ? (
                          <div className="text-sm text-zinc-600 dark:text-zinc-300">
                            No payment records yet.
                          </div>
                        ) : (
                          recentPayments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35"
                            >
                              <div>
                                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                  {payment.receiptNumber}
                                </div>
                                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                  {payment.paylinkShortCode} - {currencyFromKobo(payment.amountKobo)}
                                </div>
                                {payment.refundStatus ? (
                                  <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Refund {payment.refundStatus}
                                  </div>
                                ) : null}
                              </div>
                              <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                          Settlements
                        </div>
                        {recentSettlements.length === 0 ? (
                          <div className="text-sm text-zinc-600 dark:text-zinc-300">
                            No settlements tracked yet.
                          </div>
                        ) : (
                          recentSettlements.map((settlement: PaylinkSettlementRecord) => (
                            <div
                              key={settlement.id}
                              className="rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                    {currencyFromKobo(settlement.amountKobo)}
                                  </div>
                                  <div className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">
                                    {settlement.transferReference}
                                  </div>
                                </div>
                                <Badge tone={statusTone(settlement.status)}>{settlement.status}</Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </Card>
                </>
              ) : null}
            </>
          )}
        </Container>
      </main>
    </div>
  );
}
