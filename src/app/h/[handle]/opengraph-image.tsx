import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ handle: string }>;
};

export default async function Image({ params }: ImageProps) {
  const { handle } = await params;
  const cleanHandle = handle.replace(/^\u20A6/u, "");
  const displayHandle = `\u20A6${cleanHandle}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "linear-gradient(135deg, #f7fdf8 0%, #ffffff 45%, #eefbf4 100%)",
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
            background: "rgba(255,255,255,0.92)",
            padding: 40,
            boxShadow: "0 20px 80px rgba(15, 23, 42, 0.10)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
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
                  background: "#16a34a",
                  color: "white",
                  fontSize: 30,
                  fontWeight: 700,
                }}
              >
                {"\u20A6"}
              </div>
              NairaTag
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 999,
                border: "1px solid rgba(22, 163, 74, 0.24)",
                background: "rgba(240, 253, 244, 0.98)",
                color: "#166534",
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
                  background: "#16a34a",
                  color: "white",
                  fontSize: 18,
                }}
              >
                {"\u2713"}
              </div>
              Public handle
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1 }}>
              {displayHandle}
            </div>
            <div style={{ fontSize: 42, fontWeight: 600, color: "#111827" }}>
              NairaTag payment identity
            </div>
            <div style={{ fontSize: 28, color: "#4b5563", maxWidth: 900 }}>
              Public NairaTag profile with privacy-safe trust signals before money
              moves.
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
                minWidth: 250,
              }}
            >
              <div style={{ fontSize: 18, opacity: 0.7 }}>Identity layer</div>
              <div style={{ marginTop: 8, fontSize: 38, fontWeight: 700 }}>
                Pay by name
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 24,
                background: "rgba(22, 163, 74, 0.10)",
                color: "#166534",
                padding: "18px 22px",
                minWidth: 320,
              }}
            >
              <div style={{ fontSize: 18, opacity: 0.8 }}>What this means</div>
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 600 }}>
                Send money to a verified {"\u20A6"}handle, not an account number.
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
