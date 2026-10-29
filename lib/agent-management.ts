import type { NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/admin-supabase";
import { parsePublicIdentity, type PublicIdentity } from "@/lib/identity";

export const MANAGEMENT_BODY_LIMIT = 8192;
const PUBLIC_ID = /^kya_[0-9a-hjkmnp-tv-z]{26}$/;
const CHALLENGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MANAGEMENT_TOKEN = /^kya_mgmt_[0-9a-hjkmnp-tv-z]{52}$/;
const CHALLENGE_TOKEN = /^kya_chal_[0-9a-hjkmnp-tv-z]{26}$/;

const NO_STORE = { "Cache-Control": "no-store" };

export function managementJson(body: unknown, status: number, extra?: Record<string, string>) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

export function managementError(message: string | undefined): { status: number; error: string; message: string } | null {
  switch (message) {
    case "kya_invalid":
      return { status: 400, error: message, message: "The request is not valid." };
    case "kya_unauthorized":
      return { status: 401, error: message, message: "The management token is missing, revoked, or not valid." };
    case "kya_forbidden":
      return { status: 403, error: message, message: "That token cannot manage this identity." };
    case "kya_not_found":
      return { status: 404, error: message, message: "The identity was not found." };
    case "kya_conflict":
    case "kya_collision":
      return { status: 409, error: message, message: "The identity could not be changed." };
    case "kya_rate_limited":
      return { status: 429, error: message, message: "This identity is temporarily limited. Try again later." };
    case "kya_unavailable":
      return { status: 503, error: message, message: "The identity service is unavailable." };
    case "kya_not_implemented":
      return { status: 501, error: message, message: "That verification method is not available." };
    default:
      return null;
  }
}

export function completionError(code: string): { status: number; error: string; message: string } | null {
  switch (code) {
    case "kya_not_found":
      return { status: 404, error: code, message: "That challenge does not belong to this identity." };
    case "kya_challenge_consumed":
      return { status: 400, error: code, message: "That challenge was already used." };
    case "kya_challenge_expired":
      return { status: 400, error: code, message: "That challenge has expired." };
    case "kya_challenge_rejected":
      return { status: 400, error: code, message: "That challenge does not match the current host." };
    case "kya_challenge_mismatch":
      return { status: 400, error: code, message: "The TXT record does not match this challenge." };
    default:
      return null;
  }
}

export function publicIdParam(value: string): string | null {
  return PUBLIC_ID.test(value) ? value : null;
}

export function challengeIdParam(value: string): string | null {
  return CHALLENGE_ID.test(value) ? value.toLowerCase() : null;
}

export function rejectTokenQuery(request: NextRequest): Response | null {
  const names = ["token", "managementToken", "access_token", "publishedToken"];
  if (names.some((name) => request.nextUrl.searchParams.has(name))) {
    return managementJson({ error: "kya_invalid", message: "Send the management token in the Authorization header." }, 400);
  }
  return null;
}

export function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match || !MANAGEMENT_TOKEN.test(match[1])) return null;
  return match[1];
}

export function requireBearer(request: NextRequest): { token: string } | { response: Response } {
  const queryError = rejectTokenQuery(request);
  if (queryError) return { response: queryError };
  const token = bearerToken(request);
  if (!token) {
    return {
      response: managementJson(
        { error: "kya_unauthorized", message: "Send the management token as Authorization: Bearer." },
        401,
      ),
    };
  }
  return { token };
}

export async function readJsonObject(
  request: NextRequest,
  allowed: readonly string[],
): Promise<{ body: Record<string, unknown> } | { response: Response }> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^[0-9]+$/.test(declared) || Number(declared) > MANAGEMENT_BODY_LIMIT)) {
    return { response: managementJson({ error: "kya_invalid", message: "The request is larger than 8 KB." }, 400) };
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MANAGEMENT_BODY_LIMIT) {
    return { response: managementJson({ error: "kya_invalid", message: "The request is larger than 8 KB." }, 400) };
  }
  if (bytes.byteLength === 0) return { body: {} };

  const contentType = request.headers.get("content-type");
  if (!isJsonContentType(contentType)) {
    return { response: managementJson({ error: "kya_invalid", message: "Send the request as application/json." }, 400) };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return { response: managementJson({ error: "kya_invalid", message: "The request body is not valid JSON." }, 400) };
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { response: managementJson({ error: "kya_invalid", message: "Send a JSON object." }, 400) };
  }

  const body = payload as Record<string, unknown>;
  const unknown = Object.keys(body).filter((key) => !allowed.some((field) => field === key));
  if (unknown.length > 0) {
    return { response: managementJson({ error: "kya_invalid", message: "The request contains a field that this route does not accept." }, 400) };
  }
  return { body };
}

export async function managementRpc(
  fn: string,
  args: Record<string, unknown>,
): Promise<{ data: unknown } | { response: Response }> {
  const supabase = createAdminSupabase();
  if (!supabase) {
    return { response: managementJson({ error: "kya_unavailable", message: "The identity service is unavailable." }, 503) };
  }

  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const mapped = managementError(error.message);
    if (!mapped) {
      console.error("KYA management failed");
      return { response: managementJson({ error: "kya_unavailable", message: "The identity service is unavailable." }, 503) };
    }
    if (mapped.status === 429 || mapped.status === 503) console.error(`KYA management ${mapped.error}`);
    return { response: managementJson({ error: mapped.error, message: mapped.message }, mapped.status) };
  }
  return { data };
}

export function identityResult(data: unknown): PublicIdentity | null {
  return parsePublicIdentity(jsonRecord(data) ?? data);
}

export function issuedChallenge(data: unknown): Record<string, unknown> | null {
  const record = jsonRecord(data);
  if (!record) return null;
  const { challengeId, publishedToken, txtName, expiresAt, method, instructions } = record;
  if (typeof challengeId !== "string" || !CHALLENGE_ID.test(challengeId)) return null;
  if (typeof publishedToken !== "string" || !CHALLENGE_TOKEN.test(publishedToken)) return null;
  if (!isChallengeName(txtName)) return null;
  if (method !== "dns_txt") return null;
  if (typeof expiresAt !== "string" || !Number.isFinite(Date.parse(expiresAt))) return null;
  return {
    challengeId: challengeId.toLowerCase(),
    method: "dns_txt",
    txtName,
    publishedToken,
    expiresAt,
    instructions: typeof instructions === "string" ? instructions : "",
  };
}

export function rotatedCredential(data: unknown, publicId: string): Record<string, unknown> | null {
  const record = jsonRecord(data);
  if (!record || record.publicId !== publicId) return null;
  const managementToken = record.managementToken;
  if (typeof managementToken !== "string" || !MANAGEMENT_TOKEN.test(managementToken)) return null;
  const credentialPrefix = managementToken.slice(0, 17);
  if (record.credentialPrefix !== credentialPrefix) return null;
  return { publicId, credentialPrefix, managementToken };
}

export function revokedCredential(data: unknown, publicId: string): Record<string, unknown> | null {
  const record = jsonRecord(data);
  if (!record || record.publicId !== publicId || record.credentialRevoked !== true) return null;
  return { publicId, credentialRevoked: true };
}

export function unavailableResult(): Response {
  console.error("KYA management returned an unexpected result");
  return managementJson({ error: "kya_unavailable", message: "The identity service is unavailable." }, 503);
}

function isChallengeName(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("_kya-challenge.")) return false;
  const host = value.slice("_kya-challenge.".length);
  return host.length <= 253 && /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host);
}

function jsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      return jsonRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const [type, ...params] = value.split(";").map((part) => part.trim().toLowerCase());
  if (type !== "application/json") return false;
  return params.every((param) => param === "" || param === "charset=utf-8");
}
