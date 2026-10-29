import type { NextRequest } from "next/server";
import { rejectTokenQuery } from "@/lib/agent-management";
import { agentSearchResponse } from "@/lib/identity-commands";
import { searchPublicAgents } from "@/lib/identity-read";
import { jsonNoStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const queryError = rejectTokenQuery(request);
  if (queryError) return queryError;
  return agentSearchResponse(request.nextUrl, searchPublicAgents);
}

export function POST() {
  return jsonNoStore({ error: "kya_invalid", message: "Use GET to search identities." }, 405, { Allow: "GET" });
}
