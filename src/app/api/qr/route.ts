import { NextRequest, NextResponse } from "next/server";

import { createQrPngBuffer, createQrSvg, qrDownloadName, type QrFormat } from "@/lib/qr";

export const runtime = "nodejs";

function parseSize(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const value = params.get("value") || "";
  const label = params.get("label");
  const format = (params.get("format") === "png" ? "png" : "svg") as QrFormat;
  const size = parseSize(params.get("size"));
  const download = params.get("download") === "1";

  try {
    if (format === "png") {
      const png = await createQrPngBuffer(value, { size });
      return new NextResponse(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          ...(download
            ? { "Content-Disposition": `attachment; filename="${qrDownloadName(label, "png")}"` }
            : {}),
        },
      });
    }

    const svg = await createQrSvg(value, { size });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        ...(download
          ? { "Content-Disposition": `attachment; filename="${qrDownloadName(label, "svg")}"` }
          : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "qr_generation_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

