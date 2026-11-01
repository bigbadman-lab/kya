import type { NextRequest } from "next/server";
import { managementJson, publicIdParam, rejectTokenQuery } from "@/lib/agent-management";
import { readPassport } from "@/lib/identity-commands";
import { lookupPublicAgent } from "@/lib/identity-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ publicId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const queryError = rejectTokenQuery(request);
  if (queryError) return queryError;

  const publicId = publicIdParam((await context.params).publicId);
  if (!publicId) {
    return managementJson({ error: "kya_not_found", message: "The identity was not found." }, 404);
  }

  const result = await readPassport(publicId, lookupPublicAgent);
  return managementJson(result.body, result.status);
}
