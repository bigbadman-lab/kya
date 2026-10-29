import { observeChallengeTxt } from "@/lib/dns-txt";
import { identityRpc } from "@/lib/identity-rpc";
import { lookupPublicAgent, searchPublicAgents } from "@/lib/identity-read";
import { serveMcp } from "@/lib/mcp-http";
import { createKyaMcpHandler } from "@/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const handler = createKyaMcpHandler({
  rpc: identityRpc,
  lookup: lookupPublicAgent,
  search: searchPublicAgents,
  observe: observeChallengeTxt,
});

export function GET(request: Request) {
  return serveMcp(handler, request);
}

export function POST(request: Request) {
  return serveMcp(handler, request);
}

export function DELETE(request: Request) {
  return serveMcp(handler, request);
}
