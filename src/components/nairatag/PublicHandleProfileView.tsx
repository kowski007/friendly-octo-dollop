import Link from "next/link";

import type { PublicHandleProfile } from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import { CopyButton } from "./CopyButton";
import { Badge, ButtonLink, Card, Container, SectionHeader, cn } from "./ui";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: amount >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: amount >= 1_000_000 ? 1 : 0,
  }).format(amount);
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(value > 0 && value < 0.01 ? 2 : 1)}%`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function trustTone(score: number) {
  if (score >= 75) return "verify";
  if (score >= 50) return "orange";
  return "neutral";
}

function riskTone(riskLevel: PublicHandleProfile["reputation"]["riskLevel"]) {
  if (riskLevel === "low") return "verify";
  if (riskLevel === "medium") return "orange";
  return "neutral";
}

function profileInitials(profile: PublicHandleProfile) {
  return (
    profile.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || profile.handle.slice(0, 2).toUpperCase()
  );
}

function qrBits(seed: string) {
  const bits: boolean[] = [];
  let state = 0;
  for (const char of seed) {
    state = (state * 33 + char.charCodeAt(0)) % 2147483647;
  }
  for (let i = 0; i < 21 * 21; i++) {
    state = (state * 1103515245 + 12345) % 2147483647;
    bits.push(state % 5 !== 0);
  }
  return bits;
}

function QrPreview({ value }: { value: string }) {
  const bits = qrBits(value);

  return (
    <div className="rounded-[2rem] border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950">
      <div className="grid grid-cols-[repeat(21,minmax(0,1fr))] gap-[2px] rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-900">
        {bits.map((on, index) => (
          <div
            key={index}
            className={cn(
              "aspect-square rounded-[2px]",
              on ? "bg-zinc-950 dark:bg-zinc-50" : "bg-transparent"
            )}
          />
        ))}
      </div>
      <div className="mt-3 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Scan to pay
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <Card className="rounded-[1.75rem] p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {caption}
      </div>
    </Card>
  );
}

export function PublicHandleProfileView({
  profile,
}: {
  profile: PublicHandleProfile | null;
}) {
  if (!profile) {
    return (
      <div className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <AppPageHeader ctaHref="/agent" ctaLabel="Claim a handle" />
        <main className="py-14 sm:py-18">
          <Container>
            <Card className="p-6 sm:p-8">
              <div className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Profile not found
              </div>
              <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                This handle does not have a public NairaTag profile yet.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/agent">Claim a handle</ButtonLink>
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

  const handleLabel = `\u20A6${profile.handle}`;
  const shareText = `${handleLabel} on NairaTag`;
  const encodedShareUrl = encodeURIComponent(profile.shareUrl);
  const encodedShareText = encodeURIComponent(shareText);
  const whatsappUrl = `https://wa.me/?text=${encodedShareText}%20${encodedShareUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedShareUrl}`;
  const mailUrl = `mailto:?subject=${encodedShareText}&body=${encodedShareText}%0A${encodedShareUrl}`;

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref={profile.payUrl} ctaLabel="Send money" />

      <main className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeader
            eyebrow="Public handle profile"
            title={handleLabel}
            description="A privacy-safe trust page for verifying who owns this NairaTag handle before money moves."
          />

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={profile.verification.verified ? "verify" : "neutral"}>
                  {profile.verification.verified ? "Verified" : "Claimed"}
                </Badge>
                <Badge tone={trustTone(profile.reputation.trustScore)}>
                  Trust {profile.reputation.trustScore}/100
                </Badge>
                <Badge tone={riskTone(profile.reputation.riskLevel)}>
                  {profile.reputation.riskLevel === "unknown"
                    ? "Risk pending"
                    : `${profile.reputation.riskLevel} risk`}
                </Badge>
              </div>

              <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950">
                    {profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-lg font-semibold">
                        {profileInitials(profile)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                  <div className="text-5xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl">
                    {handleLabel}
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {profile.displayName}
                  </h1>
                  <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                    {profile.bio ?? "Verified NairaTag payment identity."}
                  </p>
                  </div>
                </div>

                <QrPreview value={profile.qrPayload} />
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <CopyButton value={handleLabel} label="Copy handle" copiedLabel="Handle copied" />
                <CopyButton value={profile.shareUrl} label="Copy link" copiedLabel="Link copied" />
                <ButtonLink href={profile.payUrl}>Send money</ButtonLink>
              </div>
            </Card>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Bank destination
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {profile.bank.name}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={profile.bank.accountVerified ? "verify" : "neutral"}>
                    {profile.bank.accountVerified ? "Account verified" : "Account pending"}
                  </Badge>
                  <Badge tone={profile.verification.bvnVerified ? "verify" : "neutral"}>
                    {profile.verification.bvnVerified ? "BVN linked" : "BVN pending"}
                  </Badge>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Reputation
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <div className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {profile.reputation.stars.toFixed(1)}
                  </div>
                  <div className="pb-1 text-sm text-zinc-600 dark:text-zinc-300">
                    from {profile.reputation.reviewCount.toLocaleString()} settled signals
                  </div>
                </div>
                {profile.reputation.creditScoreRange ? (
                  <div className="mt-4">
                    <Badge tone="verify">
                      Credit score {profile.reputation.creditScoreRange}
                    </Badge>
                  </div>
                ) : null}
              </Card>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Transactions"
              value={profile.publicStats.transactionCount.toLocaleString()}
              caption="Anonymized public count"
            />
            <StatCard
              label="Settled volume"
              value={formatCurrency(profile.publicStats.totalVolume)}
              caption="Rounded public volume"
            />
            <StatCard
              label="Recent 30d"
              value={profile.publicStats.recentTransactionCount30d.toLocaleString()}
              caption="Fresh activity signal"
            />
            <StatCard
              label="Dispute rate"
              value={formatPct(profile.publicStats.chargebackRate)}
              caption="Recorded dispute share"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="p-6 sm:p-7">
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                About
              </div>
              <div className="mt-5 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                <p>Member since {formatDate(profile.memberSince)}</p>
                {profile.location ? <p>Location: {profile.location}</p> : null}
                {profile.lastActiveAt ? (
                  <p>Last active {new Date(profile.lastActiveAt).toLocaleDateString()}</p>
                ) : null}
                <p>
                  Public profile hides phone, BVN, full account number, and individual transaction history.
                </p>
              </div>
            </Card>

            <Card className="p-6 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Badges
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    Verification and activity signals.
                  </div>
                </div>
                <Badge tone="neutral">{profile.reputation.badges.length} badges</Badge>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(profile.reputation.badges.length
                  ? profile.reputation.badges
                  : ["New handle"]
                ).map((badge) => (
                  <Badge
                    key={badge}
                    tone={
                      badge === "Verified" ||
                      badge === "High trust" ||
                      badge === "Clean history" ||
                      badge === "Low risk"
                        ? "verify"
                        : badge === "Marketplace seller"
                          ? "orange"
                          : "neutral"
                    }
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-6 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Share this handle
                </div>
                <div className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  {profile.shareUrl}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={twitterUrl}
                  className="rounded-full border border-zinc-300/70 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                >
                  Twitter
                </Link>
                <Link
                  href={whatsappUrl}
                  className="rounded-full border border-zinc-300/70 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                >
                  WhatsApp
                </Link>
                <Link
                  href={mailUrl}
                  className="rounded-full border border-zinc-300/70 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 dark:border-zinc-700/80 dark:bg-zinc-950/30 dark:text-zinc-50"
                >
                  Email
                </Link>
                <CopyButton value={profile.shareUrl} label="Copy public link" />
              </div>
            </div>
          </Card>
        </Container>
      </main>
    </div>
  );
}
