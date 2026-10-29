import type { NextRequest } from "next/server";
import {
  challengeIdParam,
  managementJson,
  publicIdParam,
  readJsonObject,
  requireBearer,
} from "@/lib/agent-management";
import { observeChallengeTxt } from "@/lib/dns-txt";
import { completeDnsVerification } from "@/lib/identity-commands";
import { identityRpc } from "@/lib/identity-rpc";
import { lookupPublicAgent } from "@/lib/identity-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ publicId: string; challengeId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = requireBearer(request);
  if ("response" in auth) return auth.response;

  const { publicId: rawId, challengeId: rawChallengeId } = await context.params;
  const publicId = publicIdParam(rawId);
  const challengeId = challengeIdParam(rawChallengeId);
  if (!publicId || !challengeId) {
    return managementJson({ error: "kya_not_found", message: "The identity was not found." }, 404);
  }
  const parsedBody = await readJsonObject(request, []);
  if ("response" in parsedBody) return parsedBody.response;

  const result = await completeDnsVerification(
    { publicId, challengeId, token: auth.token },
    { rpc: identityRpc, lookup: lookupPublicAgent, observe: observeChallengeTxt },
  );
  return managementJson(result.body, result.status);
}
