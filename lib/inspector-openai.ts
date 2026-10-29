import {
  INSPECTION_MODEL,
  inspectionPrompt,
  parseInspectionDraft,
  type InspectionDraft,
  type InspectionProfile,
} from "./inspector.ts";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 20_000;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    capabilitiesInterpretation: { type: "string" },
    useCases: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: { type: "string" },
    },
    limitations: { type: "string" },
  },
  required: ["summary", "capabilitiesInterpretation", "useCases", "limitations"],
} as const;

export async function generateInspection(
  profile: InspectionProfile,
  fetchImpl: typeof fetch = fetch,
): Promise<InspectionDraft | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const prompt = inspectionPrompt(profile);
  const body = {
    model: INSPECTION_MODEL,
    store: false,
    max_output_tokens: 1200,
    reasoning: { effort: "low" },
    instructions: prompt.instructions,
    input: prompt.input,
    text: {
      format: {
        type: "json_schema",
        name: "kya_inspection",
        strict: true,
        schema: SCHEMA,
      },
    },
  };

  let response: Response;
  try {
    response = await fetchImpl(OPENAI_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }
  const text = completedOutputText(payload);
  if (!text || text.length > 8000) return null;
  try {
    return parseInspectionDraft(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

export function completedOutputText(payload: unknown): string | null {
  if (!isRecord(payload) || payload.status !== "completed" || payload.error != null) return null;
  if (!Array.isArray(payload.output)) return null;
  const parts: string[] = [];
  for (const item of payload.output) {
    if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (!isRecord(content) || content.type !== "output_text" || typeof content.text !== "string") continue;
      parts.push(content.text);
    }
  }
  const text = parts.join("").trim();
  return text.length > 0 ? text : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
