import type { NextRequest } from "next/server";
import { CREDENTIAL_PREFIX } from "@/lib/credentials";
import {
  managementJson,
  managementRpc,
  publicIdParam,
  readJsonObject,
  rejectTokenQuery,
  requireBearer,
  unavailableResult,
} from "@/lib/agent-management";
import { lookupIdentity, updateIdentity } from "@/lib/identity-commands";
import { identityRpc } from "@/lib/identity-rpc";
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

  const result = await lookupIdentity(publicId, lookupPublicAgent);
  return managementJson(result.body, result.status);
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
  return typeof record.credentialPrefix === "string" && CREDENTIAL_PREFIX.test(record.credentialPrefix);
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

  const result = await updateIdentity({ publicId, token: auth.token, body: parsedBody.body }, identityRpc);
  return managementJson(result.body, result.status);
}
