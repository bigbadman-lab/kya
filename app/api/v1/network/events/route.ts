import type { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http";
import { searchPublicNetwork } from "@/lib/identity-read";
import { parseNetworkCursor } from "@/lib/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam === null ? 20 : Number(limitParam);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !parseNetworkCursor(cursor)) {
    return jsonNoStore({ error: "kya_invalid", message: "The network query is not valid." }, 400);
  }

  const page = await searchPublicNetwork(cursor, limit);
  if (!page.ok) {
    return jsonNoStore({ error: "kya_unavailable", message: "The network feed is unavailable." }, 503);
  }
  return jsonNoStore({ events: page.data.events, nextCursor: page.data.nextCursor }, 200);
}
