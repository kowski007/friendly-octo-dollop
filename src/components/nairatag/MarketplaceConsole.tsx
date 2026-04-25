"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  BankAccountRecord,
  ClaimRecord,
  CreditProfile,
  MarketplaceEligibility,
  MarketplaceListingDetail,
  MarketplaceTransferDetail,
  NotificationRecord,
} from "@/lib/adminTypes";
import { Badge, ButtonLink, Card, NairaTermBadge } from "./ui";

type DashboardResponse =
  | {
      ok: true;
      eligibility: MarketplaceEligibility;
      claim: ClaimRecord | null;
      bankAccount: BankAccountRecord | null;
      listing: MarketplaceListingDetail | null;
      creditProfile: CreditProfile | null;
      transfers: MarketplaceTransferDetail[];
      notifications: NotificationRecord[];
    }
  | { error: string };

function formatCurrency(amount?: number | null) {
  if (amount == null) return "Open to offers";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatHandle(handle?: string | null) {
  return handle ? `₦${handle}` : "your handle";
}

function eligibilityMessage(eligibility: MarketplaceEligibility) {
  switch (eligibility.reason) {
    case "no_handle":
      return "Claim a handle first before you can list it.";
    case "bank_link_required":
      return "Link a payout bank account before opening a marketplace listing.";
    case "reserved_short_handle":
      return "One- and two-character handles are reserved for controlled premium drops, not self-serve listings.";
    case "ownership_cooldown":
      return `Hold the handle for at least ${eligibility.minimumOwnershipDays} day(s) before listing it.`;
    case "listing_already_exists":
      return "You already have a live marketplace listing for this handle.";
    default:
      return "Sign in to open a marketplace listing.";
  }
}

function creditTone(profile: CreditProfile | null) {
  if (!profile) return "neutral";
  if (profile.riskBand === "low") return "verify";
  if (profile.riskBand === "medium") return "orange";
  return "neutral";
}

function notificationTone(priority: NotificationRecord["priority"]) {
  if (priority === "high") return "orange";
  if (priority === "low") return "neutral";
  return "verify";
}

export function MarketplaceConsole() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [saleMode, setSaleMode] = useState<"fixed_price" | "offers_only">(
    "fixed_price"
  );
  const [askAmount, setAskAmount] = useState("");
  const [minOfferAmount, setMinOfferAmount] = useState("");
  const [sellerNote, setSellerNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/marketplace/me", { cache: "no-store" });
      const data = (await response.json().catch(() => ({ error: "unknown_error" }))) as
        | DashboardResponse
        | { error: string };

      setDashboard(data);
      if (response.ok && "ok" in data && data.listing) {
        setSaleMode(data.listing.listing.saleMode);
        setAskAmount(data.listing.listing.askAmount?.toString() ?? "");
        setMinOfferAmount(data.listing.listing.minOfferAmount?.toString() ?? "");
        setSellerNote(data.listing.listing.sellerNote ?? "");
      }
    } catch {
      setDashboard({ error: "unknown_error" });
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function createListing() {
    setBusy(true);
    setError(null);
    setFeedback(null);

    try {
      const handle =
        dashboard && "ok" in dashboard ? dashboard.claim?.handle ?? "" : "";

      const response = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle,
          saleMode,
          askAmount: askAmount ? Number(askAmount) : undefined,
          minOfferAmount: minOfferAmount ? Number(minOfferAmount) : undefined,
          sellerNote,
        }),
      });
      const data = (await response.json().catch(() => ({ error: "unknown_error" }))) as
        | { ok: true }
        | { error: string };

      if (!response.ok) {
        setError("error" in data ? data.error : "Could not create listing.");
        return;
      }

      setFeedback("Listing is live. Buyers can now submit real offers.");
      await loadDashboard();
      router.refresh();
    } catch {
      setError("Could not create listing.");
    } finally {
      setBusy(false);
    }
  }

  async function saveListing(status?: "active" | "paused" | "withdrawn") {
    if (!dashboard || !("ok" in dashboard) || !dashboard.listing) return;

    setBusy(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/marketplace/listings/${dashboard.listing.listing.handle}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status,
            askAmount: askAmount ? Number(askAmount) : null,
            minOfferAmount: minOfferAmount ? Number(minOfferAmount) : null,
            sellerNote,
          }),
        }
      );
      const data = (await response.json().catch(() => ({ error: "unknown_error" }))) as
        | { ok: true }
        | { error: string };

      if (!response.ok) {
        setError("error" in data ? data.error : "Could not update listing.");
        return;
      }

      setFeedback(
        status === "paused"
          ? "Listing paused."
          : status === "withdrawn"
            ? "Listing withdrawn."
            : "Listing updated."
      );
      await loadDashboard();
      router.refresh();
    } catch {
      setError("Could not update listing.");
    } finally {
      setBusy(false);
    }
  }

  async function respondToOffer(offerId: string, action: "accept" | "reject") {
    setBusy(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/marketplace/offers/${offerId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json().catch(() => ({ error: "unknown_error" }))) as
        | { ok: true }
        | { error: string };

      if (!response.ok) {
        setError("error" in data ? data.error : "Could not review offer.");
        return;
      }

      setFeedback(
        action === "accept"
          ? "Offer accepted. The listing is now in transfer review."
          : "Offer rejected."
      );
      await loadDashboard();
      router.refresh();
    } catch {
      setError("Could not review offer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6 sm:p-7">
      {loading ? (
        <div className="rounded-[1.6rem] border border-zinc-200/70 bg-zinc-50/80 p-5 text-sm text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-300">
          Loading marketplace access...
        </div>
      ) : dashboard && "error" in dashboard ? (
        <div className="rounded-[1.6rem] border border-zinc-200/70 bg-zinc-50/80 p-5 text-sm text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-300">
          {dashboard.error === "unauthorized"
            ? "Sign in to manage listings."
            : "Could not load marketplace access right now."}
        </div>
      ) : dashboard && "ok" in dashboard ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Handle
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {formatHandle(dashboard.claim?.handle)}
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                {dashboard.claim ? "Marketplace ownership comes from the claimed handle." : "No claim yet."}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Eligibility
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {dashboard.eligibility.eligible ? "Ready" : "Blocked"}
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                {eligibilityMessage(dashboard.eligibility)}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Payout setup
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {dashboard.bankAccount ? dashboard.bankAccount.bankName : "Not linked"}
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Sellers must have a payout destination before listing.
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Credit profile
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {dashboard.creditProfile ? dashboard.creditProfile.score : "Not ready"}
                </span>
                {dashboard.creditProfile ? (
                  <Badge tone={creditTone(dashboard.creditProfile)}>
                    {dashboard.creditProfile.riskBand}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                {dashboard.creditProfile
                  ? `${formatCurrency(dashboard.creditProfile.recommendedLimit)} suggested limit`
                  : "Claim and payment history will create the score."}
              </div>
            </div>
          </div>

          <Card className="rounded-[2rem] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  In-app notifications
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Payment, marketplace, verification, and review alerts.
                </div>
              </div>
              <Badge tone="neutral">
                {dashboard.notifications.filter((item) => item.status === "unread").length} unread
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {dashboard.notifications.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-zinc-300/70 px-4 py-5 text-sm text-zinc-600 dark:border-zinc-700/70 dark:text-zinc-300">
                  No alerts yet. Payment and marketplace events will appear here.
                </div>
              ) : (
                dashboard.notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/35"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {notification.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                          {notification.body}
                        </div>
                      </div>
                      <Badge tone={notificationTone(notification.priority)}>
                        {notification.status}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {feedback ? (
            <div className="rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              {feedback}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-[1.5rem] border border-orange-200/70 bg-orange-50/80 px-4 py-3 text-sm text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
              {error}
            </div>
          ) : null}

          {dashboard.listing ? (
            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="rounded-[2rem] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="verify">Live listing</Badge>
                  <Badge tone="neutral">{dashboard.listing.listing.status.replace("_", " ")}</Badge>
                  <NairaTermBadge term="handle" tone="orange" />
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {formatHandle(dashboard.listing.listing.handle)}
                    </div>
                    <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      {dashboard.listing.claim.displayName} · owned for{" "}
                      {dashboard.listing.ownerSinceDays} day(s)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Ask
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {formatCurrency(dashboard.listing.listing.askAmount)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.3rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Pending offers
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {dashboard.listing.pendingOfferCount}
                    </div>
                  </div>
                  <div className="rounded-[1.3rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Highest live offer
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {formatCurrency(dashboard.listing.highestOfferAmount)}
                    </div>
                  </div>
                  <div className="rounded-[1.3rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Commission
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {dashboard.listing.listing.commissionBps / 100}%
                    </div>
                  </div>
                </div>

                {dashboard.listing.transfer ? (
                  <div className="mt-5 rounded-[1.5rem] border border-orange-200/70 bg-orange-50/80 p-4 dark:border-orange-900/60 dark:bg-orange-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          Transfer review open
                        </div>
                        <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                          {dashboard.listing.transfer.buyerName} accepted at{" "}
                          {formatCurrency(dashboard.listing.transfer.amount)}.
                        </div>
                      </div>
                      <Badge tone="orange">
                        {dashboard.listing.transfer.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">
                      Ask amount
                    </span>
                    <input
                      value={askAmount}
                      onChange={(event) => setAskAmount(event.target.value)}
                      type="number"
                      min={0}
                      disabled={busy || dashboard.listing.listing.status === "under_review"}
                      className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">
                      Minimum offer
                    </span>
                    <input
                      value={minOfferAmount}
                      onChange={(event) => setMinOfferAmount(event.target.value)}
                      type="number"
                      min={0}
                      disabled={busy || dashboard.listing.listing.status === "under_review"}
                      className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
                    />
                  </label>
                  <label className="space-y-2 text-sm sm:col-span-2">
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">
                      Seller note
                    </span>
                    <textarea
                      value={sellerNote}
                      onChange={(event) => setSellerNote(event.target.value)}
                      rows={3}
                      disabled={busy || dashboard.listing.listing.status === "under_review"}
                      className="w-full rounded-[1.5rem] border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void saveListing()}
                    disabled={busy || dashboard.listing.listing.status === "under_review"}
                    className="rounded-full bg-nt-orange px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save listing
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void saveListing(
                        dashboard.listing?.listing.status === "paused" ? "active" : "paused"
                      )
                    }
                    disabled={busy || dashboard.listing.listing.status === "under_review"}
                    className="rounded-full border border-zinc-300/70 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    {dashboard.listing.listing.status === "paused" ? "Relist" : "Pause"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveListing("withdrawn")}
                    disabled={busy}
                    className="rounded-full border border-zinc-300/70 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    Withdraw
                  </button>
                  {dashboard.listing.listing.status !== "paused" ? (
                    <ButtonLink
                      href={`/marketplace/${dashboard.listing.listing.handle}`}
                      variant="secondary"
                    >
                      Open public listing
                    </ButtonLink>
                  ) : null}
                  <ButtonLink
                    href={`/h/${dashboard.listing.listing.handle}`}
                    variant="secondary"
                  >
                    Public profile
                  </ButtonLink>
                </div>
              </Card>

              <Card className="rounded-[2rem] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Incoming offers
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      Accepting an offer moves the listing into transfer review. Reputation
                      stays with the verified owner until the next owner builds their own history.
                    </div>
                  </div>
                  <Badge tone="neutral">{dashboard.listing.offers.length} total</Badge>
                </div>

                <div className="mt-5 space-y-3">
                  {dashboard.listing.offers.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-zinc-300/70 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700/70 dark:text-zinc-300">
                      No offers yet. Share the public listing to start collecting demand.
                    </div>
                  ) : (
                    dashboard.listing.offers.map((offer) => (
                      <div
                        key={offer.id}
                        className="rounded-[1.4rem] border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/35"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                              {offer.buyerName}
                            </div>
                            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                              {offer.buyerPhone}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge tone={offer.status === "pending" ? "orange" : offer.status === "accepted" ? "verify" : "neutral"}>
                              {offer.status}
                            </Badge>
                            <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                              {formatCurrency(offer.amount)}
                            </div>
                          </div>
                        </div>
                        {offer.note ? (
                          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                            {offer.note}
                          </p>
                        ) : null}
                        {offer.status === "pending" ? (
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                void respondToOffer(offer.id, "accept")
                              }
                              disabled={busy}
                              className="rounded-full bg-nt-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void respondToOffer(offer.id, "reject")
                              }
                              disabled={busy}
                              className="rounded-full border border-zinc-300/70 bg-white/80 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          ) : dashboard.eligibility.eligible ? (
            <div className="rounded-[2rem] border border-zinc-200/70 bg-zinc-50/80 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/35">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">
                    Sale mode
                  </span>
                  <select
                    value={saleMode}
                    onChange={(event) =>
                      setSaleMode(event.target.value as "fixed_price" | "offers_only")
                    }
                    className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
                  >
                    <option value="fixed_price">Fixed price</option>
                    <option value="offers_only">Offers only</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">
                    Ask amount
                  </span>
                  <input
                    value={askAmount}
                    onChange={(event) => setAskAmount(event.target.value)}
                    type="number"
                    min={0}
                    placeholder={saleMode === "fixed_price" ? "50000" : "Optional"}
                    className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">
                    Minimum acceptable offer
                  </span>
                  <input
                    value={minOfferAmount}
                    onChange={(event) => setMinOfferAmount(event.target.value)}
                    type="number"
                    min={0}
                    placeholder="25000"
                    className="w-full rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
                  />
                </label>
                <label className="space-y-2 text-sm sm:col-span-2">
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">
                    Seller note
                  </span>
                  <textarea
                    value={sellerNote}
                    onChange={(event) => setSellerNote(event.target.value)}
                    rows={3}
                    placeholder="Explain why this handle is valuable, what comes with it, or any brand context."
                    className="w-full rounded-[1.5rem] border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-200 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:focus-visible:ring-orange-900/60"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void createListing()}
                  disabled={busy}
                  className="rounded-full bg-nt-orange px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Create live listing
                </button>
                <ButtonLink href={`/pay/${dashboard.claim?.handle ?? ""}`} variant="secondary">
                  Review pay page
                </ButtonLink>
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-zinc-200/70 bg-zinc-50/80 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/35">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Listing blocked
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                {eligibilityMessage(dashboard.eligibility)}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {!dashboard.claim ? (
                  <ButtonLink href="/claim">Claim a ₦handle</ButtonLink>
                ) : !dashboard.bankAccount ? (
                    <ButtonLink href="/dashboard" variant="secondary">
                      Finish payout setup
                    </ButtonLink>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
