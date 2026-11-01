import type { NextRequest } from "next/server";
import { managementJson, publicIdParam, readJsonObject, requireBearer } from "@/lib/agent-management";
import { checkInIdentity } from "@/lib/identity-commands";
import { identityRpc } from "@/lib/identity-rpc";
import { HEARTBEAT_BODY_FIELDS } from "@/lib/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ publicId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = requireBearer(request);
  if ("response" in auth) return auth.response;

  const publicId = publicIdParam((await context.params).publicId);
  if (!publicId) {
    return managementJson({ error: "kya_not_found", message: "The identity was not found." }, 404);
  }

  const parsedBody = await readJsonObject(request, HEARTBEAT_BODY_FIELDS);
  if ("response" in parsedBody) return parsedBody.response;

  const result = await checkInIdentity({ publicId, token: auth.token }, identityRpc);
  return managementJson(result.body, result.status);
}
