import {
  INSPECTION_EVIDENCE,
  INSPECTION_LABEL,
  INSPECTION_MODEL,
  parsePrepareResult,
  type InspectionDraft,
  type InspectionProfile,
  type InspectionReport,
} from "./inspector.ts";

export interface InspectionResponse extends InspectionReport {
  label: string;
}

type Step =
  | { ok: true; body: InspectionResponse }
  | { ok: false; status: number; error: string; message: string };

type RpcResult = { data: unknown } | { error: string };

const MESSAGES: Record<string, { status: number; message: string }> = {
  kya_invalid: { status: 400, message: "The inspection request is not valid." },
  kya_unauthorized: { status: 401, message: "The management token is missing, revoked, or not valid." },
  kya_forbidden: { status: 403, message: "That token cannot inspect this identity." },
  kya_not_found: { status: 404, message: "The identity was not found." },
  kya_conflict: { status: 409, message: "The profile changed before the inspection was saved. Request it again." },
  kya_rate_limited: { status: 429, message: "Inspection is temporarily limited. Try again later." },
  kya_unavailable: { status: 503, message: "Inspection is unavailable." },
};

export async function runInspection(input: {
  prepare: () => Promise<RpcResult>;
  save: (draft: InspectionDraft, sourceFingerprint: string) => Promise<RpcResult>;
  generate: (profile: InspectionProfile) => Promise<InspectionDraft | null>;
}): Promise<Step> {
  const prepared = await input.prepare();
  if ("error" in prepared) return failure(prepared.error);
  const reservation = parsePrepareResult(prepared.data);
  if (!reservation) return failure("kya_unavailable");
  if (reservation.kind === "current") {
    return { ok: true, body: responseBody({ ...reservation.report, reused: true }) };
  }

  const draft = await input.generate(reservation.profile);
  if (!draft) {
    return {
      ok: false,
      status: 503,
      error: "kya_unavailable",
      message: "Inspection could not be completed. Nothing was saved.",
    };
  }

  const saved = await input.save(draft, reservation.sourceFingerprint);
  if ("error" in saved) return failure(saved.error);
  const stored = parsePrepareResult(saved.data);
  if (!stored || stored.kind !== "current") return failure("kya_unavailable");
  return { ok: true, body: responseBody({ ...stored.report, reused: false }) };
}

function responseBody(report: InspectionReport): InspectionResponse {
  return {
    status: "current",
    summary: report.summary,
    capabilitiesInterpretation: report.capabilitiesInterpretation,
    useCases: report.useCases,
    limitations: report.limitations,
    evidence: INSPECTION_EVIDENCE,
    model: INSPECTION_MODEL,
    createdAt: report.createdAt,
    reused: report.reused === true,
    label: INSPECTION_LABEL,
  };
}

function failure(code: string): Step {
  const mapped = MESSAGES[code];
  if (!mapped) return { ok: false, status: 503, error: "kya_unavailable", message: "Inspection is unavailable." };
  return { ok: false, status: mapped.status, error: code, message: mapped.message };
}
