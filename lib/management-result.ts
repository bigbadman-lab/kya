import { CHALLENGE_ID, CHALLENGE_TOKEN, isManagementToken, isPublicId } from "./credentials.ts";
import { parsePublicIdentity, type PublicIdentity } from "./identity.ts";

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
  return isPublicId(value) ? value : null;
}

export function challengeIdParam(value: string): string | null {
  return CHALLENGE_ID.test(value) ? value.toLowerCase() : null;
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
  if (typeof managementToken !== "string" || !isManagementToken(managementToken)) return null;
  const credentialPrefix = managementToken.slice(0, 17);
  if (record.credentialPrefix !== credentialPrefix) return null;
  return { publicId, credentialPrefix, managementToken };
}

export function revokedCredential(data: unknown, publicId: string): Record<string, unknown> | null {
  const record = jsonRecord(data);
  if (!record || record.publicId !== publicId || record.credentialRevoked !== true) return null;
  return { publicId, credentialRevoked: true };
}

export function issuedRegistration(value: unknown): Record<string, unknown> | null {
  const record = jsonRecord(value);
  if (!record || typeof record.managementToken !== "string" || !isManagementToken(record.managementToken)) return null;
  const identity = parsePublicIdentity(record);
  if (!identity || identity.lifecycle !== "active" || identity.domainVerification !== "unverified") return null;
  const credentialPrefix = record.managementToken.slice(0, 17);
  if (record.credentialPrefix !== credentialPrefix) return null;

  return {
    publicId: identity.publicId,
    identityUrl: identity.identityUrl,
    name: identity.name,
    description: identity.description,
    category: identity.category,
    capabilities: identity.capabilities,
    endpointUrl: identity.endpointUrl,
    claimedHost: identity.claimedHost,
    lifecycle: identity.lifecycle,
    domainVerification: identity.domainVerification,
    verificationExpiresAt: identity.verificationExpiresAt,
    registered: identity.registered,
    managementToken: record.managementToken,
    credentialPrefix,
    dnsNextStep: `Domain verification is a separate step. With the management token, request a challenge and publish a DNS TXT record at _kya-challenge.${identity.claimedHost}. This registration does not verify the domain and does not mean the agent is safe or trustworthy.`,
  };
}

export function jsonRecord(value: unknown): Record<string, unknown> | null {
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

function isChallengeName(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("_kya-challenge.")) return false;
  const host = value.slice("_kya-challenge.".length);
  return host.length <= 253 && /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host);
}
