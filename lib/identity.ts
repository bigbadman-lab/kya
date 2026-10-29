import { isPublicId } from "./credentials.ts";

export const AGENT_CATEGORIES = [
  "Research",
  "Commerce",
  "Operations",
  "Developer tools",
] as const;

export const AGENT_CAPABILITIES = [
  "search",
  "summarize",
  "scheduling",
  "checkout",
  "code-review",
  "monitoring",
] as const;

export type AgentCategory = (typeof AGENT_CATEGORIES)[number];
export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];
export type LifecycleStatus = "active" | "suspended" | "revoked";
export type DomainVerification = "unverified" | "verified" | "expired";

export interface PublicAgentIdentity {
  publicId: string;
  identityUrl: string;
  name: string;
  description: string;
  category: AgentCategory;
  capabilities: AgentCapability[];
  endpointUrl: string;
  claimedHost: string;
  lifecycle: "active";
  domainVerification: DomainVerification;
  verificationExpiresAt: string | null;
  registered: true;
}

export interface IdentityTombstone {
  publicId: string;
  identityUrl: string;
  lifecycle: "suspended" | "revoked";
  registered: true;
}

export type PublicIdentity = PublicAgentIdentity | IdentityTombstone;

export interface RegistrySearchResult {
  agents: PublicAgentIdentity[];
  nextCursor: string | null;
}

export type IdentityReadFailure = "unavailable" | "invalid";

export type IdentityRead<T> =
  | { ok: true; data: T }
  | { ok: false; reason: IdentityReadFailure };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCategory(value: unknown): value is AgentCategory {
  return AGENT_CATEGORIES.some((category) => category === value);
}

function isCapability(value: unknown): value is AgentCapability {
  return AGENT_CAPABILITIES.some((capability) => capability === value);
}

function isDomainVerification(value: unknown): value is DomainVerification {
  return value === "unverified" || value === "verified" || value === "expired";
}

function text(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function identityPath(publicId: string): string {
  return `/agents/${publicId}`;
}

function capabilities(value: unknown): AgentCapability[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) return null;
  const seen = new Set<string>();
  const result: AgentCapability[] = [];
  for (const item of value) {
    if (!isCapability(item) || seen.has(item)) return null;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function expiry(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return undefined;
  return value;
}

export function isPublicAgentIdentity(value: PublicIdentity): value is PublicAgentIdentity {
  return value.lifecycle === "active";
}

export function parsePublicIdentity(value: unknown): PublicIdentity | null {
  if (!isRecord(value) || value.registered !== true) return null;
  const publicId = text(value, "publicId");
  if (!publicId || !isPublicId(publicId)) return null;
  if (text(value, "identityUrl") !== identityPath(publicId)) return null;

  if (value.lifecycle === "suspended" || value.lifecycle === "revoked") {
    return {
      publicId,
      identityUrl: identityPath(publicId),
      lifecycle: value.lifecycle,
      registered: true,
    };
  }

  if (value.lifecycle !== "active") return null;
  const name = text(value, "name");
  const description = text(value, "description");
  const category = value.category;
  const endpointUrl = text(value, "endpointUrl");
  const claimedHost = text(value, "claimedHost");
  const domainVerification = value.domainVerification;
  const verificationExpiresAt = expiry(value.verificationExpiresAt);
  const parsedCapabilities = capabilities(value.capabilities);
  if (
    !name ||
    !description ||
    !isCategory(category) ||
    !endpointUrl ||
    !claimedHost ||
    !isDomainVerification(domainVerification) ||
    verificationExpiresAt === undefined ||
    !parsedCapabilities
  ) {
    return null;
  }

  return {
    publicId,
    identityUrl: identityPath(publicId),
    name,
    description,
    category,
    capabilities: parsedCapabilities,
    endpointUrl,
    claimedHost,
    lifecycle: "active",
    domainVerification,
    verificationExpiresAt,
    registered: true,
  };
}

export function parseRegistrySearch(value: unknown): RegistrySearchResult | null {
  if (!isRecord(value) || !Array.isArray(value.agents)) return null;
  if (value.nextCursor !== null && typeof value.nextCursor !== "string") return null;

  const agents: PublicAgentIdentity[] = [];
  for (const item of value.agents) {
    const identity = parsePublicIdentity(item);
    if (!identity || !isPublicAgentIdentity(identity)) return null;
    if (identity.lifecycle !== "active" || identity.domainVerification !== "verified") return null;
    agents.push(identity);
  }

  return {
    agents,
    nextCursor: typeof value.nextCursor === "string" ? value.nextCursor : null,
  };
}

export function domainVerificationLabel(status: DomainVerification): string {
  if (status === "verified") return "Domain verified";
  if (status === "expired") return "Verification expired";
  return "Registered";
}

export function formatVerificationExpiry(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}
