import type { NextRequest } from "next/server";
import {
  identityResult,
  managementJson,
  managementRpc,
  publicIdParam,
  readJsonObject,
  rejectTokenQuery,
  requireBearer,
  unavailableResult,
} from "@/lib/agent-management";
import { parseRegistration } from "@/lib/registration";
import { lookupPublicAgent } from "@/lib/identity-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ publicId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const queryError = rejectTokenQuery(request);
  if (queryError) return queryError;

  const { publicId: rawId } = await context.params;
  const publicId = publicIdParam(rawId);
  if (!publicId) {
    return managementJson({ error: "kya_not_found", message: "The identity was not found." }, 404);
  }

  const header = request.headers.get("authorization");
  if (header) {
    const auth = requireBearer(request);
    if ("response" in auth) return auth.response;
    const proved = await proveActiveCredential(publicId, auth.token);
    if (proved) return proved;
  }

  const result = await lookupPublicAgent(publicId);
  if (!result.ok) {
    return managementJson({ error: "kya_unavailable", message: "The identity service is unavailable." }, 503);
  }
  if (!result.data) {
    return managementJson({ error: "kya_not_found", message: "The identity was not found." }, 404);
  }
  return managementJson(result.data, 200);
}

async function proveActiveCredential(publicId: string, token: string): Promise<Response | null> {
  const result = await managementRpc("validate_management_credential", {
    p_public_id: publicId,
    p_presented_token: token,
  });
  if ("response" in result) return result.response;
  if (!validCredential(result.data, publicId)) return unavailableResult();
  return null;
}

function validCredential(value: unknown, publicId: string): boolean {
  const record = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  if (!record || record.publicId !== publicId || record.credentialValid !== true) return false;
  if (record.lifecycle !== "active" && record.lifecycle !== "suspended") return false;
  return typeof record.credentialPrefix === "string"
    && /^kya_mgmt_[0-9a-hjkmnp-tv-z]{8}$/.test(record.credentialPrefix);
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = requireBearer(request);
  if ("response" in auth) return auth.response;

  const { publicId: rawId } = await context.params;
  const publicId = publicIdParam(rawId);
  if (!publicId) {
    return managementJson({ error: "kya_not_found", message: "The identity was not found." }, 404);
  }

  const parsedBody = await readJsonObject(request, [
    "name",
    "description",
    "endpointUrl",
    "category",
    "capabilities",
    "agentCardUrl",
  ]);
  if ("response" in parsedBody) return parsedBody.response;

  const parsed = parseRegistration(parsedBody.body);
  if (!parsed.ok) {
    return managementJson(
      { error: "kya_invalid", message: parsed.failure.message, fields: parsed.failure.fields },
      400,
    );
  }

  const result = await managementRpc("update_agent_metadata", {
    p_public_id: publicId,
    p_presented_token: auth.token,
    p_actor_user_id: null,
    p_name: parsed.data.name,
    p_description: parsed.data.description,
    p_endpoint_url: parsed.data.endpointUrl,
    p_claimed_host: parsed.data.claimedHost,
    p_category: parsed.data.category,
    p_capabilities: parsed.data.capabilities,
    p_agent_card_url: parsed.data.agentCardUrl,
  });
  if ("response" in result) return result.response;

  const identity = identityResult(result.data);
  if (!identity) return unavailableResult();
  return managementJson(identity, 200);
}
