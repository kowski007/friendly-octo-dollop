type OGBadge = {
  label: string;
  tone?: "green" | "white" | "dark";
};

type OGInfoRow = {
  label: string;
  value: string;
};

type OGFeatureCard = {
  label: string;
  value: string;
  tone?: "green" | "dark" | "soft";
};

type OGCardInput = {
  brandLabel: string;
  topBadge: OGBadge;
  title: string;
  subtitle: string;
  description: string;
  eyebrow?: string;
  accentLabel?: string;
  infoRows: OGInfoRow[];
  featureCards: OGFeatureCard[];
};

export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
};

type AccentPalette = {
  accent: string;
  accentDeep: string;
  border: string;
  hero: string;
  badgeText: string;
  footerStamp: string;
};

function accentPalette(tone: OGBadge["tone"]): AccentPalette {
  if (tone === "green") {
    return {
      accent: "#D8FF1A",
      accentDeep: "#BEE900",
      border: "#CBEF12",
      hero: "#0B0B0B",
      badgeText: "#0B0B0B",
      footerStamp: "#D8FF1A",
    };
  }

  return {
    accent: "#F05A1A",
    accentDeep: "#D84D11",
    border: "#F05A1A",
    hero: "#F05A1A",
    badgeText: "#0B0B0B",
    footerStamp: "#F05A1A",
  };
}

export function verificationLabel(status: string | undefined) {
  if (status === "business") return "Business verified";
  if (status === "verified") return "Verified identity";
  return "Claimed handle";
}

function splitHeroLines(input: string) {
  const value = input.trim().replace(/\s+/g, " ");
  if (!value) return ["NairaTag"];

  if (value.includes(" ")) {
    const words = value.split(" ");
    if (words.length === 2) return words;

    let bestLeft = value;
    let bestRight = "";
    let bestScore = Number.POSITIVE_INFINITY;

    for (let index = 1; index < words.length; index += 1) {
      const left = words.slice(0, index).join(" ");
      const right = words.slice(index).join(" ");
      const score = Math.abs(left.length - right.length);
      if (score < bestScore) {
        bestScore = score;
        bestLeft = left;
        bestRight = right;
      }
    }

    return bestRight ? [bestLeft, bestRight] : [bestLeft];
  }

  if (value.length <= 12) return [value];

  const hasHandlePrefix = value.startsWith("\u20A6");
  const body = hasHandlePrefix ? value.slice(1) : value;
  const breakAt =
    body.length > 18 ? Math.ceil(body.length / 2) : Math.min(10, Math.ceil(body.length / 2));
  const left = `${hasHandlePrefix ? "\u20A6" : ""}${body.slice(0, breakAt)}`;
  const right = body.slice(breakAt);
  return right ? [left, right] : [left];
}

function heroFontSize(lines: string[]) {
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  if (longest <= 6) return 168;
  if (longest <= 9) return 150;
  if (longest <= 12) return 136;
  if (longest <= 16) return 114;
  if (longest <= 20) return 96;
  return 84;
}

function emphasizeToken(title: string) {
  const handleMatch = title.match(/\u20A6?[a-z0-9._]+/iu);
  if (handleMatch) {
    const handle = handleMatch[0].replace(/^\u20A6/u, "");
    return `\u20A6${handle}`.toUpperCase();
  }

  const words = title
    .replace(/[^\p{L}\p{N}._ ]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "NAIRATAG";
  return words.slice(0, 2).join("").toUpperCase();
}

function copyLines(input: OGCardInput) {
  const marker = emphasizeToken(input.title);
  const brand = input.brandLabel.toLowerCase();
  if (brand.includes("referral")) {
    return ["INVITE FRIENDS.", "CLAIM YOUR HANDLE.", `JUST ${marker}.`];
  }
  if (brand.includes("pay") || input.title.toLowerCase().includes("pay")) {
    return ["SEND MONEY.", "NO ACCOUNT NUMBER.", `JUST ${marker}.`];
  }
  if (brand.includes("profile")) {
    return ["SEND MONEY.", "VERIFY THE IDENTITY.", `JUST ${marker}.`];
  }
  return ["CLAIM A HANDLE.", "VERIFY IDENTITY.", `JUST ${marker}.`];
}

function qrCopy(input: OGCardInput) {
  const brand = input.brandLabel.toLowerCase();
  if (brand.includes("referral")) return ["SCAN", "TO JOIN"];
  if (brand.includes("pay") || input.title.toLowerCase().includes("pay")) {
    return ["SCAN", "TO PAY"];
  }
  return ["SCAN", "TO VIEW"];
}

function textureLayer() {
  return {
    backgroundImage: [
      "radial-gradient(circle at 14% 12%, rgba(255,255,255,0.5) 0, rgba(255,255,255,0) 16%)",
      "radial-gradient(circle at 82% 18%, rgba(0,0,0,0.06) 0, rgba(0,0,0,0) 18%)",
      "radial-gradient(circle at 70% 72%, rgba(0,0,0,0.04) 0, rgba(0,0,0,0) 20%)",
      "repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 7px)",
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 9px)",
    ].join(", "),
  };
}

function QrGlyph({ accent }: { accent: string }) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: 126,
        height: 126,
        background: "#FFFFFF",
        border: "4px solid #111111",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 10,
          top: 10,
          width: 28,
          height: 28,
          border: "7px solid #111111",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 10,
          top: 10,
          width: 28,
          height: 28,
          border: "7px solid #111111",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 10,
          width: 28,
          height: 28,
          border: "7px solid #111111",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 50,
          top: 16,
          width: 14,
          height: 14,
          background: "#111111",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 66,
          top: 38,
          width: 12,
          height: 12,
          background: "#111111",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 46,
          top: 48,
          width: 20,
          height: 20,
          background: "#111111",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 76,
          top: 58,
          width: 18,
          height: 18,
          background: "#111111",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 50,
          bottom: 20,
          width: 16,
          height: 16,
          background: "#111111",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 30,
          bottom: 26,
          width: 12,
          height: 12,
          background: "#111111",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 50,
          bottom: 44,
          width: 18,
          height: 18,
          background: "#111111",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 45,
          top: 45,
          width: 36,
          height: 36,
          borderRadius: 10,
          background: accent,
          color: "#ffffff",
          alignItems: "center",
          justifyContent: "center",
          display: "flex",
          fontSize: 24,
          fontWeight: 900,
          fontFamily: '"Arial Black", Impact, sans-serif',
        }}
      >
        {"\u20A6"}
      </div>
    </div>
  );
}

function Barcode({ accent, label }: { accent: string; label: string }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 36,
        bottom: 90,
        width: 74,
        height: 214,
        background: "#F8F3EA",
        borderLeft: "1px solid rgba(17,17,17,0.08)",
        alignItems: "center",
        justifyContent: "flex-start",
        display: "flex",
        flexDirection: "column",
        paddingTop: 20,
      }}
    >
      <div style={{ display: "flex", gap: 4, height: 124, alignItems: "stretch" }}>
        {[6, 2, 8, 3, 5, 2, 7].map((width, index) => (
          <div
            key={`${label}:${index}`}
            style={{
              width,
              height: 124,
              background: "#111111",
            }}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 18,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#111111",
          transform: "rotate(-90deg)",
          transformOrigin: "center",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 10,
          fontSize: 12,
          fontWeight: 900,
          color: accent,
        }}
      >
        NG
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 10,
          fontSize: 12,
          fontWeight: 900,
          color: accent,
        }}
      >
        2026
      </div>
    </div>
  );
}

export function renderOgCard(input: OGCardInput) {
  const accent = accentPalette(input.topBadge.tone);
  const lines = splitHeroLines(input.title);
  const heroSize = heroFontSize(lines);
  const leftCopy = copyLines(input);
  const qrLines = qrCopy(input);
  const footerCards = input.featureCards.slice(0, 2);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0A0A0A",
        padding: 18,
        color: "#0B0B0B",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: 18,
          background: "#F4EFE6",
          border: `12px solid ${accent.border}`,
          boxShadow: `0 0 0 2px rgba(11,11,11,0.08), inset 0 0 0 1px rgba(255,255,255,0.22)`,
          ...textureLayer(),
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 6,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 12%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.05) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 34,
            top: 28,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            fontWeight: 900,
            fontSize: 20,
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          <div>NAIRATAG</div>
          <div>{input.brandLabel.replace(/^./, (value) => value.toUpperCase())}</div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 210,
            top: 30,
            width: 36,
            height: 20,
            borderRadius: 999,
            border: "2px solid rgba(11,11,11,0.65)",
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              border: "2px solid rgba(11,11,11,0.65)",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            top: 28,
            right: 36,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 3,
            textTransform: "uppercase",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900 }}>NAIRATAG.NG</div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em" }}>
            THE EASIEST WAY
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em" }}>
            TO MOVE MONEY
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em" }}>
            THROUGH IDENTITY.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 34,
            right: 430,
            top: 88,
            height: 2,
            background: "#111111",
            opacity: 0.9,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 102,
            right: 36,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            border: `3px solid ${accent.accent}`,
            color: accent.badgeText,
            background: input.topBadge.tone === "green" ? accent.accent : "transparent",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              border: `3px solid ${accent.accent}`,
              alignItems: "center",
              justifyContent: "center",
              display: "flex",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            {"\u2713"}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              fontSize: 18,
              fontWeight: 900,
              lineHeight: 0.95,
              textTransform: "uppercase",
            }}
          >
            <div>{input.topBadge.label.split(" ")[0] || "VERIFIED"}</div>
            <div>
              {input.topBadge.label.split(" ").slice(1).join(" ") || "HANDLE"}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 36,
            top: 120,
            width: 760,
            display: "flex",
            flexDirection: "column",
            gap: 0,
            fontFamily: '"Arial Black", Impact, sans-serif',
            color: accent.hero,
            lineHeight: 0.82,
            letterSpacing: "-0.08em",
            textTransform: "none",
          }}
        >
          {lines.map((line, index) => (
            <div
              key={`${line}:${index}`}
              style={{
                display: "flex",
                fontSize: heroSize - index * 8,
                fontWeight: 900,
                maxWidth: 760,
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 36,
            top: 266,
            width: 250,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 18,
            fontWeight: 900,
            lineHeight: 1.05,
            textTransform: "uppercase",
          }}
        >
          <div>{leftCopy[0]}</div>
          <div>{leftCopy[1]}</div>
          <div>
            JUST{" "}
            <span style={{ color: accent.accent }}>{leftCopy[2].replace(/^JUST /, "")}</span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 132,
            top: 260,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 18,
            fontWeight: 900,
            lineHeight: 1.02,
            textTransform: "uppercase",
          }}
        >
          <div>FAST</div>
          <div>SECURE</div>
          <div>
            SIMPLE <span style={{ color: accent.accent, fontSize: 10 }}>TM</span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 320,
            top: 182,
            width: 560,
            height: 296,
            background:
              "linear-gradient(180deg, rgba(15,15,15,0.98) 0%, rgba(22,22,22,0.96) 100%)",
            overflow: "hidden",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 24,
              top: 18,
              fontSize: 160,
              lineHeight: 0.8,
              fontFamily: '"Arial Black", Impact, sans-serif',
              color: "rgba(255,255,255,0.06)",
              letterSpacing: "-0.12em",
              transform: "rotate(-6deg)",
            }}
          >
            {"\u20A6N"}
          </div>
          <div
            style={{
              position: "absolute",
              right: -16,
              top: 32,
              width: 300,
              height: 220,
              borderRadius: 220,
              background:
                "radial-gradient(circle at 38% 36%, rgba(255,255,255,0.10) 0, rgba(255,255,255,0.02) 24%, rgba(0,0,0,0) 60%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 36,
              bottom: 28,
              right: 26,
              display: "flex",
              gap: 12,
            }}
          >
            {input.infoRows.slice(0, 3).map((row) => (
              <div
                key={`${row.label}:${row.value}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  padding: "12px 12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.62)",
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    lineHeight: 1.05,
                    color: "#FFFFFF",
                  }}
                >
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 42,
            bottom: 98,
            width: 206,
            height: 188,
            background: accent.accent,
            borderRadius: 14,
            boxShadow:
              "0 14px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)",
            display: "flex",
            flexDirection: "column",
            padding: "16px 16px 14px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 12,
              width: 56,
              height: 22,
              background: "rgba(255,255,255,0.14)",
              transform: "rotate(-14deg)",
            }}
          />
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: "#111111",
              color: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              display: "flex",
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            {"\u20A6"}
          </div>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              flexDirection: "column",
              gap: 0,
              fontSize: 18,
              fontWeight: 900,
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            <div>{qrLines[0]}</div>
            <div>{qrLines[1]}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <QrGlyph accent={accent.accentDeep} />
          </div>
          <div
            style={{
              marginTop: "auto",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            POWERED BY NAIRATAG
          </div>
        </div>

        <Barcode
          accent={accent.accent}
          label="YOUR NAME. YOUR MONEY. YOUR WAY."
        />

        <div
          style={{
            position: "absolute",
            left: 34,
            right: 34,
            bottom: 74,
            height: 2,
            background: "#111111",
            opacity: 0.92,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 34,
            right: 34,
            bottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                background: "#111111",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 900,
                fontFamily: '"Arial Black", Impact, sans-serif',
              }}
            >
              {"\u20A6"}
            </div>
            <div
              style={{
                width: 2,
                height: 44,
                background: "#111111",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  lineHeight: 1.02,
                  textTransform: "uppercase",
                }}
              >
                {footerCards[0]?.label || "Pay anyone"}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  lineHeight: 1.02,
                  textTransform: "uppercase",
                  maxWidth: 220,
                }}
              >
                {(footerCards[0]?.value || "With just a NairaTag.").slice(0, 48)}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: "2px solid #111111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: "2px solid #111111",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  lineHeight: 1.02,
                  textTransform: "uppercase",
                }}
              >
                {input.accentLabel || "NairaTag"}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  lineHeight: 1.02,
                  textTransform: "uppercase",
                  maxWidth: 260,
                }}
              >
                {(footerCards[1]?.value || "Global identity for payments.").slice(0, 52)}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                background: accent.footerStamp,
                alignItems: "center",
                justifyContent: "center",
                display: "flex",
                boxShadow: "inset 0 0 0 8px rgba(255,255,255,0.76)",
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  fontFamily: '"Arial Black", Impact, sans-serif',
                  color: "#111111",
                }}
              >
                {"\u20A6"}
              </div>
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              VERIFIED HANDLE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
