import { NextResponse, type NextRequest } from "next/server";

import { logApiUsage, resolveHandleBySocial } from "@/lib/adminStore";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const platform = (req.nextUrl.searchParams.get("platform") ?? "").trim().toLowerCase();
  const username = (req.nextUrl.searchParams.get("username") ?? "").trim();
  const clientKey = req.headers.get("x-nt-api-key") ?? undefined;

  try {
    if (platform !== "telegram") {
      const res = NextResponse.json(
        { error: "unsupported_social_platform" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
      await logApiUsage({
        endpoint: "/api/resolve/social",
        method: "GET",
        status: 400,
        latencyMs: Date.now() - started,
        clientKey,
      });
      return res;
    }

    const result = await resolveHandleBySocial({
      platform: "telegram",
      username,
    });

    const status = result ? 200 : 404;
    const res = NextResponse.json(
      result
        ? {
            ok: true,
            data: {
              handle: result.handle,
              displayName: result.displayName,
              verification: result.verification,
              bank: result.bank,
              social: {
                platform: result.social.platform,
                username: result.social.username,
              },
              payUrl: result.payUrl,
            },
          }
        : { error: "social_handle_not_found" },
      { status, headers: { "Cache-Control": "no-store" } }
    );

    await logApiUsage({
      endpoint: "/api/resolve/social",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
      handle: result?.handle,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "invalid_telegram_username" ? 400 : 500;
    const res = NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
    await logApiUsage({
      endpoint: "/api/resolve/social",
      method: "GET",
      status,
      latencyMs: Date.now() - started,
      clientKey,
    });
    return res;
  }
}
