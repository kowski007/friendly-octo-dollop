import { ImageResponse } from "next/og";

import { getPublicReferralShare } from "@/lib/adminStore";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ code: string }>;
};

export default async function Image({ params }: ImageProps) {
  const { code } = await params;
  const share = await getPublicReferralShare(code);
  const handle = share?.referrerHandle ? `\u20A6${share.referrerHandle}` : "NairaTag invite";
  const title = share?.displayName ?? "Claim your ₦handle on NairaTag";
  const verification =
    share?.verification === "business"
      ? "Business verified"
      : share?.verification === "verified"
        ? "Verified referrer"
        : "Referral invite";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "linear-gradient(135deg, #fff7ed 0%, #ffffff 48%, #eef2ff 100%)",
          color: "#111827",
          padding: "48px",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            borderRadius: 36,
            border: "1px solid rgba(229, 231, 235, 0.9)",
            background: "rgba(255,255,255,0.90)",
            padding: 40,
            boxShadow: "0 20px 80px rgba(15, 23, 42, 0.10)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  display: "flex",
                  height: 56,
                  width: 56,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ff6a00",
                  color: "white",
                  fontSize: 30,
                  fontWeight: 700,
                }}
              >
                ₦
              </div>
              NairaTag Referral
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 999,
                border: "1px solid rgba(16, 185, 129, 0.28)",
                background: "rgba(236, 253, 245, 0.95)",
                color: "#065f46",
                padding: "12px 18px",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  display: "flex",
                  height: 28,
                  width: 28,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#10b981",
                  color: "white",
                  fontSize: 18,
                }}
              >
                ✓
              </div>
              {verification}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.02 }}>
              {handle}
            </div>
            <div style={{ fontSize: 40, fontWeight: 600, color: "#111827" }}>
              {title}
            </div>
            <div style={{ fontSize: 28, color: "#4b5563", maxWidth: 900 }}>
              Claim your own ₦handle through this invite. Referral points are tracked on signup and again when you claim.
            </div>
          </div>

          <div style={{ display: "flex", gap: 20 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 24,
                background: "#111827",
                color: "white",
                padding: "18px 22px",
                minWidth: 240,
              }}
            >
              <div style={{ fontSize: 18, opacity: 0.7 }}>Invite rewards</div>
              <div style={{ marginTop: 8, fontSize: 36, fontWeight: 700 }}>
                +{share?.signupPoints ?? 25} / +{share?.conversionPoints ?? 100}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 24,
                background: "rgba(79, 70, 229, 0.10)",
                color: "#312e81",
                padding: "18px 22px",
                minWidth: 320,
              }}
            >
              <div style={{ fontSize: 18, opacity: 0.8 }}>Referral history</div>
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 600 }}>
                {share ? `${share.totalReferrals} signup(s), ${share.convertedReferrals} claimed` : "Start your claim flow"}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
