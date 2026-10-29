import type { NextRequest } from "next/server";
import {
  challengeIdParam,
  completionError,
  identityResult,
  managementError,
  managementJson,
  managementRpc,
  publicIdParam,
  readJsonObject,
  requireBearer,
  unavailableResult,
} from "@/lib/agent-management";
import { observeChallengeTxt } from "@/lib/dns-txt";
import { isPublicAgentIdentity } from "@/lib/identity";
import { lookupPublicAgent } from "@/lib/identity-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ publicId: string; challengeId: string }> };

const MISSING_TXT = {
  error: "kya_challenge_mismatch",
  message: "No TXT record was found at the challenge name. Publish it, wait for DNS, and try again. The challenge is still pending.",
};

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

  const lookup = await lookupPublicAgent(publicId);
  if (!lookup.ok) {
    return managementJson({ error: "kya_unavailable", message: "The identity service is unavailable." }, 503);
  }
  if (!lookup.data || !isPublicAgentIdentity(lookup.data)) {
    return (await authorizeOnly(publicId, challengeId, auth.token)) ?? unavailableResult();
  }

  const authorized = await authorizeOnly(publicId, challengeId, auth.token);
  if (authorized) return authorized;

  const observed = await observeChallengeTxt(lookup.data.claimedHost);
  if (observed.status === "unavailable") {
    return managementJson(
      { error: "kya_unavailable", message: "The DNS lookup did not succeed. The challenge is still pending." },
      503,
    );
  }
  if (observed.status === "missing") return managementJson(MISSING_TXT, 400);

  const result = await managementRpc("complete_dns_challenge", {
    p_public_id: publicId,
    p_presented_token: auth.token,
    p_actor_user_id: null,
    p_challenge_id: challengeId,
    p_observed_txt_values: observed.values,
  });
  if ("response" in result) return result.response;

  const record = jsonObject(result.data);
  if (record && typeof record.error === "string") {
    const mapped = completionError(record.error);
    if (!mapped) return unavailableResult();
    return managementJson({ error: mapped.error, message: mapped.message }, mapped.status);
  }

  const identity = identityResult(result.data);
  if (!identity || !isPublicAgentIdentity(identity) || identity.domainVerification !== "verified") {
    return unavailableResult();
  }
  return managementJson(identity, 200);
}

async function authorizeOnly(publicId: string, challengeId: string, token: string): Promise<Response | null> {
  const result = await managementRpc("complete_dns_challenge", {
    p_public_id: publicId,
    p_presented_token: token,
    p_actor_user_id: null,
    p_challenge_id: challengeId,
    p_observed_txt_values: [],
  });
  if (!("response" in result)) return unavailableResult();

  const body = await result.response.clone().json().catch(() => null);
  const code = jsonObject(body)?.error;
  if (code === "kya_invalid") return null;
  if (typeof code === "string" && managementError(code)) return result.response;
  return result.response;
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
