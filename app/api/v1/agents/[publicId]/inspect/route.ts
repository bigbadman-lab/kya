import type { NextRequest } from "next/server";
import {
  managementJson,
  managementRpc,
  publicIdParam,
  readJsonObject,
  requireBearer,
  unavailableResult,
} from "@/lib/agent-management";
import { INSPECTION_EVIDENCE, INSPECTION_MODEL, type InspectionDraft } from "@/lib/inspector";
import { generateInspection } from "@/lib/inspector-openai";
import { runInspection } from "@/lib/run-inspection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Context = { params: Promise<{ publicId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = requireBearer(request);
  if ("response" in auth) return auth.response;

  const parsedBody = await readJsonObject(request, []);
  if ("response" in parsedBody) return parsedBody.response;

  const { publicId: rawId } = await context.params;
  const publicId = publicIdParam(rawId);
  if (!publicId) {
    return managementJson({ error: "kya_not_found", message: "The identity was not found." }, 404);
  }
  if (!process.env.OPENAI_API_KEY) {
    return managementJson({ error: "kya_unavailable", message: "Inspection is unavailable." }, 503);
  }

  const proved = await managementRpc("validate_management_credential", {
    p_public_id: publicId,
    p_presented_token: auth.token,
  });
  if ("response" in proved) return proved.response;
  if (lifecycleOf(proved.data) === "suspended") {
    return managementJson({ error: "kya_forbidden", message: "Inspection is available for an active identity." }, 403);
  }
  if (!activeCredential(proved.data, publicId)) return unavailableResult();

  const result = await runInspection({
    prepare: () => rpcData("prepare_inspection", {
      p_public_id: publicId,
      p_presented_token: auth.token,
    }),
    generate: (profile) => generateInspection(profile),
    save: (draft, sourceFingerprint) => rpcData("save_inspector_report", saveArgs(publicId, auth.token, draft, sourceFingerprint)),
  });
  if (!result.ok) {
    if (result.status === 503) console.error("KYA inspection failed");
    return managementJson({ error: result.error, message: result.message }, result.status);
  }
  return managementJson(result.body, 200);
}

function saveArgs(publicId: string, token: string, draft: InspectionDraft, sourceFingerprint: string) {
  return {
    p_public_id: publicId,
    p_presented_token: token,
    p_source_fingerprint: sourceFingerprint,
    p_summary: draft.summary,
    p_interpretation: draft.capabilitiesInterpretation,
    p_use_cases: draft.useCases,
    p_limitations: draft.limitations,
    p_evidence: INSPECTION_EVIDENCE,
    p_model: INSPECTION_MODEL,
  };
}

async function rpcData(fn: string, args: Record<string, unknown>): Promise<{ data: unknown } | { error: string }> {
  const result = await managementRpc(fn, args);
  if (!("response" in result)) return { data: result.data };
  const payload: unknown = await result.response.json().catch(() => null);
  const error = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : "kya_unavailable";
  return { error };
}

function lifecycleOf(value: unknown): string | null {
  const record = recordOf(value);
  return record && typeof record.lifecycle === "string" ? record.lifecycle : null;
}

function activeCredential(value: unknown, publicId: string): boolean {
  const record = recordOf(value);
  if (!record || record.publicId !== publicId || record.credentialValid !== true || record.lifecycle !== "active") return false;
  return typeof record.credentialPrefix === "string" && /^kya_mgmt_[0-9a-hjkmnp-tv-z]{8}$/.test(record.credentialPrefix);
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
