import type { NextRequest } from "next/server";
import {
  managementJson,
  publicIdParam,
  readJsonObject,
  requireBearer,
} from "@/lib/agent-management";
import { issueDnsChallenge } from "@/lib/identity-commands";
import { identityRpc } from "@/lib/identity-rpc";

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

  const result = await issueDnsChallenge(
    { publicId, token: auth.token, method: parsedBody.body.method },
    identityRpc,
  );
  return managementJson(result.body, result.status);
}
