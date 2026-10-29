import { isPublicId } from "./credentials.ts";
import { isPublicAgentIdentity, type PublicAgentIdentity, type PublicIdentity } from "./identity.ts";

export const SITE_ORIGIN = "https://knowyouragent.fun";
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

export type CardTone = "registered" | "verified" | "inactive";

export interface IdentityCardModel {
  illustrative: boolean;
  publicId: string;
  name: string | null;
  category: string | null;
  host: string | null;
  capabilities: string[];
  extraCapabilities: number;
  tone: CardTone;
  badge: string;
  support: string;
  profilePath: string | null;
}

export interface CardImageAccess {
  status: 200 | 404 | 503;
  cacheControl: "no-store";
  card: IdentityCardModel | null;
}

const ILLUSTRATIVE_ID = "kya_7h2q9m4c8w1n5r0x3y6z2d4g80";

export function truncateCardText(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function hostOf(endpoint: string): string {
  try {
    return new URL(endpoint).hostname;
  } catch {
    return "";
  }
}

function capabilityView(capabilities: readonly string[]): { shown: string[]; extra: number } {
  return {
    shown: capabilities.slice(0, 3),
    extra: Math.max(0, capabilities.length - 3),
  };
}

export function currentlyVerified(identity: PublicAgentIdentity, now = Date.now()): boolean {
  if (identity.lifecycle !== "active" || identity.domainVerification !== "verified") return false;
  if (!identity.verificationExpiresAt) return false;
  const expiry = Date.parse(identity.verificationExpiresAt);
  return Number.isFinite(expiry) && expiry > now;
}

export function cardFromIdentity(identity: PublicIdentity, now = Date.now()): IdentityCardModel {
  if (!isPublicAgentIdentity(identity)) {
    return {
      illustrative: false,
      publicId: identity.publicId,
      name: null,
      category: null,
      host: null,
      capabilities: [],
      extraCapabilities: 0,
      tone: "inactive",
      badge: identity.lifecycle === "suspended" ? "SUSPENDED" : "REVOKED",
      support: "Public details are not listed",
      profilePath: identity.identityUrl,
    };
  }

  const verified = currentlyVerified(identity, now);
  const capabilities = capabilityView(identity.capabilities);
  return {
    illustrative: false,
    publicId: identity.publicId,
    name: truncateCardText(identity.name, 48),
    category: identity.category,
    host: truncateCardText(identity.claimedHost, 42),
    capabilities: capabilities.shown,
    extraCapabilities: capabilities.extra,
    tone: verified ? "verified" : "registered",
    badge: verified ? "DOMAIN VERIFIED" : "REGISTERED",
    support: verified
      ? "DNS domain-control check is current"
      : identity.domainVerification === "expired"
        ? "Not currently verified"
        : "Domain not verified",
    profilePath: identity.identityUrl,
  };
}

export function cardFromRegistration(input: {
  publicId: string;
  identityUrl: string;
  name: string;
  category: string;
  capabilities: readonly string[];
  endpoint: string;
}): IdentityCardModel {
  const capabilities = capabilityView(input.capabilities);
  const host = hostOf(input.endpoint);
  return {
    illustrative: false,
    publicId: input.publicId,
    name: truncateCardText(input.name, 48),
    category: input.category || null,
    host: host ? truncateCardText(host, 42) : null,
    capabilities: capabilities.shown,
    extraCapabilities: capabilities.extra,
    tone: "registered",
    badge: "REGISTERED",
    support: "Domain not verified",
    profilePath: input.identityUrl,
  };
}

export function illustrativeCard(): IdentityCardModel {
  return {
    illustrative: true,
    publicId: ILLUSTRATIVE_ID,
    name: "Example agent",
    category: "Research",
    host: "agent.example",
    capabilities: ["search", "summarize"],
    extraCapabilities: 0,
    tone: "registered",
    badge: "REGISTERED",
    support: "Domain not verified",
    profilePath: null,
  };
}

export function cardPngPath(publicId: string): string {
  return `/api/v1/agents/${publicId}/card.png`;
}

export function profileUrl(profilePath: string): string {
  return `${SITE_ORIGIN}${profilePath}`;
}

export function downloadName(publicId: string): string {
  return `kya-${publicId}.png`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function shareText(card: IdentityCardModel): string {
  if (card.tone === "verified" && card.name) {
    return `${card.name} has current domain verification on KYA.`;
  }
  if (card.tone === "inactive") {
    return `${card.publicId} is ${card.badge.toLowerCase()} on KYA. Public details are not listed.`;
  }
  return `${card.name ?? card.publicId} is registered on KYA. Domain verification is not current.`;
}

export function shareUrl(card: IdentityCardModel): string | null {
  if (!card.profilePath) return null;
  const url = new URL("https://x.com/intent/tweet");
  url.searchParams.set("text", shareText(card));
  url.searchParams.set("url", profileUrl(card.profilePath));
  return url.toString();
}

export function embedSnippet(card: IdentityCardModel): string | null {
  if (!card.profilePath || card.illustrative) return null;
  const page = profileUrl(card.profilePath);
  const image = `${SITE_ORIGIN}${cardPngPath(card.publicId)}`;
  const label = card.name ? `KYA identity card for ${card.name}` : `KYA identity ${card.publicId}`;
  return `<a href="${escapeHtml(page)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(label)}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"></a>`;
}

export function snapshotLine(now: Date): string {
  const iso = now.toISOString().slice(0, 10);
  return `Snapshot ${iso}. Check the live profile for current status.`;
}

export function cardImageAccess(
  rawId: string,
  lookup: { ok: true; data: PublicIdentity | null } | { ok: false; reason: "unavailable" | "invalid" } | null,
): CardImageAccess {
  const denied = { status: 404 as const, cacheControl: "no-store" as const, card: null };
  if (!isPublicId(rawId) || !lookup) return denied;
  if (!lookup.ok) return { status: 503, cacheControl: "no-store", card: null };
  if (!lookup.data || lookup.data.publicId !== rawId) return denied;
  return { status: 200, cacheControl: "no-store", card: cardFromIdentity(lookup.data) };
}
