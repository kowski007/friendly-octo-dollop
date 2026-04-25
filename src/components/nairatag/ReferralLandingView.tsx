"use client";

import Link from "next/link";
import { useEffect } from "react";

import type { PublicReferralShare } from "@/lib/adminTypes";

import { AppPageHeader } from "./AppPageHeader";
import { HandleIdentity } from "./HandleTrust";
import { Badge, ButtonLink, Card, Container, SectionHeader } from "./ui";

type ReferralLandingViewProps = {
  share: PublicReferralShare | null;
};

const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setReferralCookie(value: string) {
  if (!value) return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = [
    `nt_ref=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${REF_COOKIE_MAX_AGE}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function ReferralLandingView({ share }: ReferralLandingViewProps) {
  useEffect(() => {
    if (!share) return;
    setReferralCookie(share.code);
  }, [share]);

  if (!share) {
    return (
      <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <AppPageHeader ctaHref="/claim" ctaLabel="Claim a ₦handle" />
        <main className="py-14 sm:py-18">
          <Container>
            <Card className="p-6 sm:p-8">
              <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Referral link not found
              </div>
              <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                This invite link is no longer active. You can still open NairaTag and claim your
                own ₦handle directly.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/claim">Claim your ₦handle</ButtonLink>
                <ButtonLink href="/" variant="secondary">
                  Back home
                </ButtonLink>
              </div>
            </Card>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/claim" ctaLabel="Continue to claim" />

      <main className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeader
            eyebrow="Referral invite"
            title="Claim your ₦handle with a live NairaTag referral."
            description="This invite is already attached to your session. Continue into the claim flow and the referral points will be tracked automatically."
          />

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="orange">Referral active</Badge>
                <Badge tone="verify">+{share.signupPoints} signup points</Badge>
                <Badge tone="verify">+{share.conversionPoints} claim bonus</Badge>
              </div>

              <div className="mt-6">
                {share.referrerHandle ? (
                  <HandleIdentity
                    handle={share.referrerHandle}
                    verification={share.verification}
                    size="lg"
                  />
                ) : (
                  <div className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    NairaTag invite
                  </div>
                )}
                <div className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {share.displayName}
                </div>
                <div className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                  Join through this invite, verify your session, and claim your own ₦handle. The referral
                  is now saved to your browser and will be applied during signup.
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/r/${share.code}/continue`}
                  onClick={() => setReferralCookie(share.code)}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-nt-orange px-5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Continue to claim
                </Link>
                <ButtonLink href="/" variant="secondary">
                  Learn more first
                </ButtonLink>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/85 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  What happens next
                </div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  <p>1. Open the claim flow and verify your phone or wallet session.</p>
                  <p>2. Choose your own `₦handle`.</p>
                  <p>3. The referrer earns points for signup, then more when you claim.</p>
                </div>
              </div>
            </Card>

            <div className="space-y-5">
              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Invite signals
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-zinc-50/85 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                    <span className="text-sm text-zinc-600 dark:text-zinc-300">Trust score</span>
                    <Badge tone={share.trustScore >= 60 ? "verify" : "neutral"}>
                      {share.trustScore}/100
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-zinc-50/85 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                    <span className="text-sm text-zinc-600 dark:text-zinc-300">Total referrals</span>
                    <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {share.totalReferrals.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-zinc-50/85 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
                    <span className="text-sm text-zinc-600 dark:text-zinc-300">Converted referrals</span>
                    <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {share.convertedReferrals.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Share context
                </div>
                <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  <p>This link is built for handle-based referrals, not a generic coupon code.</p>
                  <p>Your session stores the referral before signup, so attribution survives the claim flow.</p>
                  <p>After you claim, you can get your own `/r/your_handle` invite link too.</p>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
