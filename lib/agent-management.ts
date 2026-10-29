import type { NextRequest } from "next/server";
import { bearerManagementToken } from "@/lib/credentials";
import { jsonNoStore } from "@/lib/http";
import { identityRpc } from "@/lib/identity-rpc";
import {
  challengeIdParam,
  completionError,
  identityResult,
  issuedChallenge,
  managementError,
  publicIdParam,
  revokedCredential,
  rotatedCredential,
} from "@/lib/management-result";

export const MANAGEMENT_BODY_LIMIT = 8192;

export {
  challengeIdParam,
  completionError,
  identityResult,
  issuedChallenge,
  managementError,
  publicIdParam,
  revokedCredential,
  rotatedCredential,
};

export function managementJson(body: unknown, status: number, extra?: Record<string, string>) {
  return jsonNoStore(body, status, extra);
}

export function rejectTokenQuery(request: NextRequest): Response | null {
  const names = ["token", "managementToken", "access_token", "publishedToken"];
  if (names.some((name) => request.nextUrl.searchParams.has(name))) {
    return managementJson({ error: "kya_invalid", message: "Send the management token in the Authorization header." }, 400);
  }
  return null;
}

export function bearerToken(request: NextRequest): string | null {
  return bearerManagementToken(request.headers.get("authorization"));
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
  const result = await identityRpc(fn, args);
  if ("error" in result) {
    const mapped = managementError(result.error);
    if (!mapped) {
      console.error("KYA management failed");
      return { response: managementJson({ error: "kya_unavailable", message: "The identity service is unavailable." }, 503) };
    }
    if (mapped.status === 429 || mapped.status === 503) console.error(`KYA management ${mapped.error}`);
    return { response: managementJson({ error: mapped.error, message: mapped.message }, mapped.status) };
  }
  return { data: result.data };
}

export function unavailableResult(): Response {
  console.error("KYA management returned an unexpected result");
  return managementJson({ error: "kya_unavailable", message: "The identity service is unavailable." }, 503);
}

function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const [type, ...params] = value.split(";").map((part) => part.trim().toLowerCase());
  if (type !== "application/json") return false;
  return params.every((param) => param === "" || param === "charset=utf-8");
}
