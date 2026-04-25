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
import { AppPageHeader } from "./AppPageHeader";
import { CopyButton } from "./CopyButton";
import { HandleIdentity } from "./HandleTrust";
import { useToast } from "./ToastProvider";
import { Badge, Card, Container, SectionHeader } from "./ui";

const NAIRA = "\u20A6";

type MeResponse =
  | {
      ok: true;
      user: UserRecord;
      claim: ClaimRecord | null;
      bankAccount: BankAccountRecord | null;
    }
  | { error: string };

type DashboardResponse =
  | ({ ok: true } & PaylinksDashboardData)
  | { error: string };

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
  if (status === "paused" || status === "queued" || status === "processing") {
    return "neutral" as const;
  }
  return "orange" as const;
}

export function PaymentLinkBuilder() {
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
  const [amountType, setAmountType] = useState<
    "fixed" | "open" | "range" | "suggested"
  >("open");
  const [amount, setAmount] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [suggestedAmounts, setSuggestedAmounts] = useState("2000,5000,10000");
  const [feeBearer, setFeeBearer] = useState<"recipient" | "payer">("recipient");

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
  const paylinks = dashboard && "ok" in dashboard ? dashboard.paylinks : [];
  const payments = dashboard && "ok" in dashboard ? dashboard.payments : [];
  const settlements = dashboard && "ok" in dashboard ? dashboard.settlements : [];
  const summary = dashboard && "ok" in dashboard ? dashboard.summary : null;

  const previewShortCode = useMemo(() => {
    if (!claim) return "";
    const cleanSlug = slugify(slug);
    return cleanSlug ? `${claim.handle}/${cleanSlug}` : claim.handle;
  }, [claim, slug]);

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
  }

  function showWarning(titleText: string, description: string) {
    setError(description);
    toast({
      title: titleText,
      description,
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

    const cleanSlug = slugify(slug);
    if (!cleanSlug) {
      showWarning("Slug required", "Add a slug for this PayLink.");
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
          }),
        });

        const body = (await response.json().catch(() => null)) as
          | { error?: string; url?: string }
          | null;
        if (!response.ok) {
          throw new Error(body?.error || "paylink_create_failed");
        }

        await loadData();
        resetForm();
        const message = `PayLink created at ${body?.url || `/pay/${previewShortCode}`}`;
        setStatus(message);
        toast({
          title: "PayLink created",
          description: message,
          tone: "success",
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message.replace(/_/g, " ")
            : "Unable to create PayLink.";
        setError(message);
        toast({
          title: "PayLink creation failed",
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
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        if (!response.ok) throw new Error(body?.error || "paylink_update_failed");
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
          err instanceof Error
            ? err.message.replace(/_/g, " ")
            : "Unable to update PayLink.";
        setError(message);
        toast({
          title: "PayLink update failed",
          description: message,
          tone: "error",
        });
      }
    });
  }

  const needsSetup = !claim || !bankAccount;

  return (
    <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/dashboard/paylinks" ctaLabel="Dashboard manager" />

      <main className="py-10">
        <Container className="space-y-8">
          <SectionHeader
            eyebrow="Saved PayLinks"
            title="Create hosted links, track payments, and monitor settlements."
            description="This is the real PayLink manager. Save a public link, send payers through Flutterwave checkout, then monitor payment and settlement state from one dashboard."
          />

          {loading ? (
            <Card className="p-6">
              <div className="text-sm font-semibold">Loading PayLink workspace...</div>
            </Card>
          ) : !me || !("ok" in me) ? (
            <Card className="p-6">
              <div className="space-y-3">
                <Badge tone="orange">Sign in required</Badge>
                <div className="text-2xl font-semibold tracking-tight">
                  We need your signed-in NairaTag session first.
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  Sign in, claim a {NAIRA}handle, and this manager becomes your PayLink operating console.
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
                    Claim your ₦handle
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                    Active PayLinks
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">
                    {summary?.activePaylinks ?? 0}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                    Successful payments
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">
                    {summary?.successfulPayments ?? 0}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                    Gross volume
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">
                    {currencyFromKobo(summary?.grossVolumeKobo)}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                    Outstanding settlements
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">
                    {currencyFromKobo(summary?.outstandingSettlementsKobo)}
                  </div>
                </Card>
              </div>

              {!claim ? (
                <Card className="overflow-hidden">
                  <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="p-6 sm:p-7">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="orange">Claim your {NAIRA}handle</Badge>
                        <Badge tone="neutral">Required before PayLinks</Badge>
                      </div>
                      <div className="mt-5 max-w-2xl">
                        <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                          Your PayLink needs a real NairaTag identity first.
                        </div>
                        <div className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-300">
                          Claiming a {NAIRA}handle gives your hosted link a stable identity, a payment destination, and a verification path that visitors can trust.
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          href="/claim"
                          className="inline-flex h-12 items-center justify-center rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white transition hover:brightness-110"
                        >
                          Claim your {NAIRA}handle
                        </Link>
                        <Link
                          href="/dashboard"
                          className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-200/80 px-4 text-sm font-semibold dark:border-zinc-800/80"
                        >
                          Open dashboard
                        </Link>
                      </div>
                    </div>

                    <div className="border-t border-zinc-200/70 bg-zinc-50/80 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/30 lg:border-l lg:border-t-0 sm:p-7">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                        Setup path
                      </div>
                      <div className="mt-4 space-y-3">
                        {[
                          ["1", `Claim ${NAIRA}handle`, "Reserve your public payment identity."],
                          ["2", "Link bank", "Attach the payout destination behind the link."],
                          ["3", "Publish PayLink", "Launch a saved checkout URL with receipts."],
                        ].map(([step, titleText, detailText]) => (
                          <div
                            key={step}
                            className="flex items-start gap-3 rounded-[1.35rem] border border-zinc-200/70 bg-white/90 px-4 py-4 dark:border-zinc-800/80 dark:bg-zinc-950/40"
                          >
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-nt-orange text-xs font-semibold text-white">
                              {step}
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                {titleText}
                              </div>
                              <div className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                                {detailText}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ) : null}

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={needsSetup ? "orange" : "verify"}>
                      {needsSetup ? "Setup incomplete" : "Ready to publish"}
                    </Badge>
                    {claim ? (
                      <HandleIdentity
                        handle={claim.handle}
                        verification={claim.verification}
                        size="sm"
                      />
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-4">
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
                        placeholder="Creator session, event RSVP, invoice..."
                        className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                      />
                    </label>

                    <label className="block">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        Slug
                      </div>
                      <div className="mt-2 flex h-12 items-center rounded-xl border border-zinc-200/80 bg-white/85 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                        <div className="px-4 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                          /pay/{claim?.handle || "handle"}/
                        </div>
                        <input
                          value={slug}
                          onChange={(event) => setSlug(slugify(event.target.value))}
                          placeholder="creator-session"
                          className="min-w-0 flex-1 bg-transparent pr-4 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        Description
                      </div>
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={3}
                        placeholder="Explain what this payment link is for."
                        className="mt-2 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
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
                          className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                        >
                          <option value="open">Open amount</option>
                          <option value="fixed">Fixed amount</option>
                          <option value="range">Range</option>
                          <option value="suggested">Suggested amounts</option>
                        </select>
                      </label>

                      <label className="block">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                          Fee bearer
                        </div>
                        <select
                          value={feeBearer}
                          onChange={(event) => setFeeBearer(event.target.value as "recipient" | "payer")}
                          className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                        >
                          <option value="recipient">Recipient absorbs fee</option>
                          <option value="payer">Payer absorbs fee</option>
                        </select>
                      </label>
                    </div>

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
                          className="mt-2 h-12 w-full rounded-xl border border-zinc-200/80 bg-white/85 px-4 text-sm font-semibold text-zinc-950 outline-none dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-50"
                        />
                      </label>
                    ) : null}

                    {amountType === "range" ? (
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

                    {amountType === "suggested" ? (
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
                  </div>

                  <div className="mt-5 rounded-[1.4rem] border border-zinc-200/70 bg-zinc-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                      Public URL preview
                    </div>
                    <div className="mt-2 break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">
                      {previewUrl || "Create a slug to preview the public URL."}
                    </div>
                  </div>

                  {status ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                      {status}
                    </div>
                  ) : null}
                  {error ? (
                    <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={createPaylink}
                    disabled={isPending || needsSetup}
                    className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-nt-orange px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? "Saving PayLink..." : "Create saved PayLink"}
                  </button>
                </Card>

                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Setup
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                        <span>Claimed {NAIRA}handle</span>
                        {claim ? (
                          <HandleIdentity
                            handle={claim.handle}
                            verification={claim.verification}
                            size="sm"
                          />
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

                  <Card className="p-6">
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Recent receipts
                    </div>
                    <div className="mt-4 space-y-3">
                      {payments.length === 0 ? (
                        <div className="text-sm text-zinc-600 dark:text-zinc-300">
                          No PayLink payments yet.
                        </div>
                      ) : (
                        payments.slice(0, 5).map((payment: PaylinkPaymentRecord) => (
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
                              <span className="inline-flex items-center text-xs text-zinc-500 dark:text-zinc-400">
                                {dateLabel(payment.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>

              <Card className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Saved PayLinks
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      Publish, pause, or remove hosted links without losing their historical receipts.
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

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="p-6">
                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Payment statuses
                  </div>
                  <div className="mt-4 space-y-3">
                    {payments.length === 0 ? (
                      <div className="text-sm text-zinc-600 dark:text-zinc-300">
                        No payment records yet.
                      </div>
                    ) : (
                      payments.slice(0, 8).map((payment) => (
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
                          </div>
                          <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Settlement tracking
                  </div>
                  <div className="mt-4 space-y-3">
                    {settlements.length === 0 ? (
                      <div className="text-sm text-zinc-600 dark:text-zinc-300">
                        No settlements tracked yet.
                      </div>
                    ) : (
                      settlements.slice(0, 8).map((settlement: PaylinkSettlementRecord) => (
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
                </Card>
              </div>
            </>
          )}
        </Container>
      </main>
    </div>
  );
}
