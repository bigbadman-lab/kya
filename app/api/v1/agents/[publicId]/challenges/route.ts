import type { NextRequest } from "next/server";
import {
  issuedChallenge,
  managementJson,
  managementRpc,
  publicIdParam,
  readJsonObject,
  requireBearer,
  unavailableResult,
} from "@/lib/agent-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ publicId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = requireBearer(request);
  if ("response" in auth) return auth.response;

  const { publicId: rawId } = await context.params;
  const publicId = publicIdParam(rawId);
  if (!publicId) {
    return managementJson({ error: "kya_not_found", message: "The identity was not found." }, 404);
  }

  const parsedBody = await readJsonObject(request, ["method"]);
  if ("response" in parsedBody) return parsedBody.response;
  const method = parsedBody.body.method === undefined ? "dns_txt" : parsedBody.body.method;
  if (typeof method !== "string") {
    return managementJson({ error: "kya_invalid", message: "The verification method is not valid." }, 400);
  }

  const result = await managementRpc("issue_dns_challenge", {
    p_public_id: publicId,
    p_presented_token: auth.token,
    p_actor_user_id: null,
    p_method: method,
  });
  if ("response" in result) return result.response;

  const issued = issuedChallenge(result.data);
  if (!issued) return unavailableResult();
  return managementJson(issued, 201);
}
