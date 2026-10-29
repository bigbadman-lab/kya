import type { NextRequest } from "next/server";
import {
  managementJson,
  managementRpc,
  publicIdParam,
  readJsonObject,
  requireBearer,
  rotatedCredential,
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

  const parsedBody = await readJsonObject(request, []);
  if ("response" in parsedBody) return parsedBody.response;

  const result = await managementRpc("rotate_management_credential", {
    p_public_id: publicId,
    p_presented_token: auth.token,
    p_actor_user_id: null,
  });
  if ("response" in result) return result.response;

  const rotated = rotatedCredential(result.data, publicId);
  if (!rotated) return unavailableResult();
  return managementJson(rotated, 200);
}
