import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Returns the caller's public IP. Devices behind the same router share one public
 * IP, so the client hashes this into a network room id to auto-group same-WiFi
 * peers (Snapdrop-style). The raw IP never leaves this response — it's hashed
 * client-side before being used or shown.
 */
export async function GET(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip =
    forwarded.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "local";

  return NextResponse.json(
    { ip },
    { headers: { "cache-control": "no-store" } },
  );
}
