"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { BankAccountRecord, ClaimRecord, UserRecord } from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import { CopyButton } from "./CopyButton";
import {
  Badge,
  ButtonLink,
  Card,
  CheckIcon,
  Container,
  NairaTermBadge,
  SectionHeader,
} from "./ui";

type MeResponse =
  | {
      ok: true;
      user: UserRecord;
      claim: ClaimRecord | null;
      bankAccount: BankAccountRecord | null;
    }
  | { error: string };

function formatCurrency(amount: string) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return "Flexible amount";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function createQuery(amount: string, note: string) {
  const params = new URLSearchParams();
  const normalizedAmount = Number(amount);
  if (Number.isFinite(normalizedAmount) && normalizedAmount > 0) {
    params.set("amount", String(Math.round(normalizedAmount)));
  }
  if (note.trim()) {
    params.set("note", note.trim());
  }
  return params.toString();
}

export function PaymentLinkBuilder() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const json = (await response.json()) as MeResponse;
        if (!cancelled) {
          setData(json);
        }
      } catch {
        if (!cancelled) {
          setData({ error: "Unable to load your payment identity right now." });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const claim = data && "ok" in data ? data.claim : null;
  const bankAccount = data && "ok" in data ? data.bankAccount : null;
  const query = createQuery(amount, note);
  const relativeLink = claim ? `/pay/${claim.handle}${query ? `?${query}` : ""}` : "";
  const fullLink = relativeLink ? `${origin}${relativeLink}` : "";
  const shareText = claim
    ? `${formatCurrency(amount)} to ₦${claim.handle}${note.trim() ? ` for ${note.trim()}` : ""}`
    : "";

  const linkState = !claim ? "missing-handle" : !bankAccount ? "needs-bank" : "ready";

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref={claim ? relativeLink || `/pay/${claim.handle}` : "/agent"} ctaLabel={claim ? "Open live link" : "Claim your handle"} />

      <main className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeader
            eyebrow="Payment link builder"
            title="Create and share your hosted payment link."
            description="This is the creator-facing side of the Phase 2 payment link flow. Configure the amount, add a note, preview the public link, and copy it anywhere you want people to pay you from."
          />

          {loading ? (
            <Card className="p-6 sm:p-7">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Loading your payment setup...
              </div>
            </Card>
          ) : !data || !("ok" in data) ? (
            <Card className="p-6 sm:p-7">
              <div className="space-y-5">
                <Badge tone="orange">Sign in required</Badge>
                <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Verify your phone first.
                </div>
                <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                  We need a signed-in user session so the builder knows which handle and payout destination belong to you.
                </p>
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/agent">Start with the agent</ButtonLink>
                  <ButtonLink href="/" variant="secondary">
                    Back home
                  </ButtonLink>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="p-6 sm:p-7">
                {!claim ? (
                  <div className="space-y-5">
                    <Badge tone="orange">No claimed handle yet</Badge>
                    <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      Claim a <NairaTermBadge term="handle" tone="orange" size="md" /> before creating your payment link.
                    </div>
                    <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                      Your public pay link is generated from your claimed handle. Once you claim one, this page becomes your hosted payment-link builder.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <ButtonLink href="/agent">Claim with the agent</ButtonLink>
                      <ButtonLink href="/" variant="secondary">
                        Check handles
                      </ButtonLink>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={linkState === "ready" ? "verify" : "orange"}>
                            {linkState === "ready" ? "Ready to share" : "Setup incomplete"}
                          </Badge>
                          <NairaTermBadge term="handle" tone="orange" />
                        </div>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
                          ₦{claim.handle}
                        </h1>
                        <div className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">
                          {claim.displayName && !/^pending verification$/i.test(claim.displayName)
                            ? claim.displayName
                            : "Use your handle as the payment identity"}
                        </div>
                      </div>

                      <div className="rounded-[1.75rem] border border-zinc-200/70 bg-zinc-50/80 px-5 py-4 text-right dark:border-zinc-800/70 dark:bg-zinc-900/40">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Destination
                        </div>
                        <div className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                          {claim.bank}
                        </div>
                        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                          {bankAccount?.status === "verified"
                            ? "Verified payout destination"
                            : bankAccount
                              ? "Linked payout destination"
                              : "Bank link still needed"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="rounded-[1.75rem] border border-zinc-200/70 bg-white/75 p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/35">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Requested amount
                        </div>
                        <input
                          inputMode="numeric"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
                          placeholder="5000"
                          className="mt-4 w-full border-0 bg-transparent p-0 text-3xl font-semibold tracking-tight text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                        />
                        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                          Leave empty if the sender should choose the amount.
                        </div>
                      </label>

                      <label className="rounded-[1.75rem] border border-zinc-200/70 bg-white/75 p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/35">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Note
                        </div>
                        <textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="Dinner, design work, product session..."
                          rows={4}
                          className="mt-4 w-full resize-none border-0 bg-transparent p-0 text-base leading-7 text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                        />
                        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                          Optional text that explains what the payment is for.
                        </div>
                      </label>
                    </div>

                    <div className="rounded-[2rem] border border-zinc-200/70 bg-zinc-50/80 p-5 dark:border-zinc-800/70 dark:bg-zinc-900/35">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                            Public payment link
                          </div>
                          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            This is the exact hosted page your customers or friends will open.
                          </div>
                        </div>
                        <Badge tone={linkState === "ready" ? "verify" : "orange"}>
                          {formatCurrency(amount)}
                        </Badge>
                      </div>

                      <div className="mt-4 rounded-2xl border border-zinc-200/70 bg-white/90 px-4 py-3 font-mono text-sm text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-950/65 dark:text-zinc-200">
                        {fullLink || "Your payment link will appear here once your handle is loaded."}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {fullLink ? (
                          <CopyButton value={fullLink} label="Copy payment link" copiedLabel="Link copied" />
                        ) : null}
                        {fullLink ? (
                          <CopyButton
                            value={`Pay ${shareText} — ${fullLink}`}
                            label="Copy share text"
                            copiedLabel="Share text copied"
                          />
                        ) : null}
                        {relativeLink ? (
                          <Link
                            href={relativeLink}
                            className="inline-flex items-center justify-center rounded-full bg-nt-orange px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                          >
                            Open live payment page
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <div className="space-y-5">
                <Card className="p-6">
                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Builder checklist
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    <li className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                      Phone session is active
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                      Claimed handle is loaded automatically
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                      Amount and note are encoded directly into the public link
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon
                        className={`mt-0.5 h-4 w-4 ${bankAccount ? "text-emerald-500" : "text-orange-500"}`}
                      />
                      {bankAccount
                        ? "Payout destination is linked"
                        : "Link a bank destination to make the payment page fully usable"}
                    </li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Suggested presets
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {["2000", "5000", "10000", "25000"].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAmount(value)}
                        className="rounded-full border border-zinc-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/50 dark:text-zinc-50 dark:hover:bg-zinc-900/70"
                      >
                        {formatCurrency(value)}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Next upgrade path
                  </div>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                    <p>Hosted links first</p>
                    <p>Processor-backed checkout second</p>
                    <p>Widget and partner embeds after that</p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <ButtonLink href="/marketplace" variant="secondary">
                      Browse handles
                    </ButtonLink>
                    <ButtonLink href="/map" variant="secondary">
                      Watch live map
                    </ButtonLink>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
