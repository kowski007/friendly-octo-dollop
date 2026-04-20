"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { ClaimRecord } from "@/lib/adminTypes";
import { AppPageHeader } from "./AppPageHeader";
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  NairaTermBadge,
  SectionHeader,
} from "./ui";

type ClaimsResponse = {
  total: number;
  items: ClaimRecord[];
};

type MapNode = {
  city: string;
  x: number;
  y: number;
};

const NIGERIA_NODES: MapNode[] = [
  { city: "Lagos", x: 19, y: 76 },
  { city: "Ibadan", x: 28, y: 59 },
  { city: "Benin", x: 38, y: 67 },
  { city: "Port Harcourt", x: 51, y: 76 },
  { city: "Enugu", x: 56, y: 62 },
  { city: "Abuja", x: 50, y: 39 },
  { city: "Jos", x: 58, y: 34 },
  { city: "Kaduna", x: 46, y: 23 },
  { city: "Kano", x: 60, y: 12 },
  { city: "Maiduguri", x: 78, y: 16 },
];

function hashHandle(handle: string) {
  let out = 0;
  for (const char of handle) out = (out * 31 + char.charCodeAt(0)) >>> 0;
  return out;
}

function clusterForClaim(claim: ClaimRecord) {
  const node = NIGERIA_NODES[hashHandle(claim.handle) % NIGERIA_NODES.length];
  return {
    ...node,
    claim,
  };
}

function relativeTime(iso: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ClaimsMapView({ initialClaims }: { initialClaims: ClaimRecord[] }) {
  const [claims, setClaims] = useState(initialClaims);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function refresh() {
      try {
        const response = await fetch("/api/admin/claims?limit=24", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const json = (await response.json()) as ClaimsResponse;
        setClaims(json.items);
      } catch {
        // Keep the last successful snapshot on screen.
      }
    }

    const run = () => startTransition(() => void refresh());
    const id = window.setInterval(run, 9000);
    return () => window.clearInterval(id);
  }, [startTransition]);

  const clusters = useMemo(() => claims.map(clusterForClaim), [claims]);
  const hotCity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cluster of clusters) {
      counts.set(cluster.city, (counts.get(cluster.city) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Lagos";
  }, [clusters]);

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <AppPageHeader ctaHref="/marketplace" ctaLabel="Open marketplace" />

      <main className="py-14 sm:py-18">
        <Container className="space-y-8">
          <SectionHeader
            eyebrow="Live activity"
            title="Watch handle claims pulse across the network."
            description="This is the realtime network surface for Phase 0 and early Phase 2. It highlights newly claimed identities, live hotspots, and the handles picking up momentum first."
          />

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="overflow-hidden rounded-[2rem] p-0">
              <div className="flex items-center justify-between border-b border-zinc-200/70 px-6 py-5 dark:border-zinc-800/70">
                <div>
                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Claimed handle map
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    Approximate live clusters based on the claim feed
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="orange">{claims.length} recent claims</Badge>
                  <Badge tone="verify">{isPending ? "Refreshing" : "Live"}</Badge>
                </div>
              </div>

              <div className="relative min-h-[540px] overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(255,106,0,0.12),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(34,197,94,0.12),transparent_32%),linear-gradient(to_bottom,rgba(250,250,250,0.96),rgba(244,244,245,0.9))] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(255,106,0,0.16),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(34,197,94,0.12),transparent_32%),linear-gradient(to_bottom,rgba(17,17,19,0.98),rgba(10,10,12,0.98))]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)]" />

                <div className="pointer-events-none absolute inset-[8%_12%_10%_12%] rounded-[42%_58%_48%_52%/40%_32%_68%_60%] border border-zinc-300/70 bg-white/35 shadow-[inset_0_0_80px_rgba(255,255,255,0.35)] dark:border-zinc-700/70 dark:bg-white/5" />

                {NIGERIA_NODES.map((node) => (
                  <div
                    key={node.city}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                    <div className="h-2.5 w-2.5 rounded-full bg-zinc-400/80 dark:bg-zinc-600" />
                    <div className="mt-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      {node.city}
                    </div>
                  </div>
                ))}

                {clusters.map((cluster, index) => (
                  <a
                    key={cluster.claim.id}
                    href={`/pay/${cluster.claim.handle}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }}
                  >
                    <span
                      className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-400/40 bg-orange-400/10 nt-map-pulse"
                      style={{ animationDelay: `${index * 140}ms` }}
                    />
                    <span className="relative flex items-center gap-2 rounded-full border border-white/85 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-900 shadow-lg backdrop-blur dark:border-zinc-800/90 dark:bg-zinc-950/85 dark:text-zinc-50">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-nt-orange" />
                      ₦{cluster.claim.handle}
                    </span>
                  </a>
                ))}

                <div className="absolute bottom-5 left-5 max-w-sm rounded-[1.75rem] border border-zinc-200/75 bg-white/88 p-5 shadow-lg backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/75">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="orange">Hot zone</Badge>
                    <Badge tone="neutral">{hotCity}</Badge>
                  </div>
                  <div className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                    The live map is useful for spotting regional demand, emerging merchant-style handles, and where identity claims are concentrating first.
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-5">
              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Today’s pulse
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 px-4 py-4 dark:border-zinc-800/70 dark:bg-zinc-900/40">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Active feed
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {claims.length}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 px-4 py-4 dark:border-zinc-800/70 dark:bg-zinc-900/40">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Hot cluster
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {hotCity}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-zinc-200/70 bg-zinc-50/80 px-4 py-4 dark:border-zinc-800/70 dark:bg-zinc-900/40">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Premium-ready
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {claims.filter((claim) => claim.handle.length <= 6).length}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Recent claims
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      Fresh handles hitting the feed now
                    </div>
                  </div>
                  <NairaTermBadge term="handle" tone="orange" />
                </div>

                <div className="mt-5 space-y-3">
                  {claims.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-zinc-300/70 px-4 py-8 text-sm text-zinc-600 dark:border-zinc-700/70 dark:text-zinc-300">
                      No claim activity yet. Claim the first handle to light the map up.
                    </div>
                  ) : (
                    claims.slice(0, 10).map((claim) => {
                      const cluster = clusterForClaim(claim);
                      return (
                        <a
                          key={claim.id}
                          href={`/pay/${claim.handle}`}
                          className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-zinc-200/70 bg-white/80 px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-50 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/55"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                              ₦{claim.handle}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {claim.displayName} · {cluster.city}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                              {relativeTime(claim.claimedAt)}
                            </div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                              {claim.verification}
                            </div>
                          </div>
                        </a>
                      );
                    })
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Next actions
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ButtonLink href="/marketplace" variant="secondary">
                    Open marketplace
                  </ButtonLink>
                  <ButtonLink href="/agent">Claim your handle</ButtonLink>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
