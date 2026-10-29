import type { NextRequest } from "next/server";
import {
  identityResult,
  managementJson,
  managementRpc,
  publicIdParam,
  readJsonObject,
  requireBearer,
  unavailableResult,
} from "@/lib/agent-management";

type LifecycleAction = "suspend" | "reinstate" | "revoke";

export async function lifecycleAction(
  request: NextRequest,
  context: { params: Promise<{ publicId: string }> },
  action: LifecycleAction,
) {
  const auth = requireBearer(request);
  if ("response" in auth) return auth.response;

  const { publicId: rawId } = await context.params;
  const publicId = publicIdParam(rawId);
  if (!publicId) {
    return managementJson({ error: "kya_not_found", message: "The identity was not found." }, 404);
  }

  const parsedBody = await readJsonObject(request, []);
  if ("response" in parsedBody) return parsedBody.response;

  const result = await managementRpc("set_lifecycle", {
    p_public_id: publicId,
    p_presented_token: auth.token,
    p_actor_user_id: null,
    p_action: action,
  });
  if ("response" in result) return result.response;

  const identity = identityResult(result.data);
  if (!identity) return unavailableResult();
  return managementJson(identity, 200);
}
