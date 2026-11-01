import { isPublicId } from "./credentials.ts";
import { SITE_ORIGIN } from "./identity-card.ts";
import {
  isPublicAgentIdentity,
  type PresenceStatus,
  type PublicIdentity,
} from "./identity.ts";

export const HEARTBEAT_BODY_FIELDS: readonly string[] = [];

export const PRESENCE_RECENT_MS = 15 * 60 * 1000;
export const CHECK_IN_GAP_MS = 60 * 1000;
export const RECOMMENDED_CHECK_IN_MS = 5 * 60 * 1000;

export const NETWORK_EVENTS = ["domain_verified", "profile_updated", "last_check_in"] as const;
export type NetworkEventType = (typeof NETWORK_EVENTS)[number];

export interface NetworkEvent {
  occurredAt: string;
  publicId: string;
  identityUrl: string;
  name: string;
  eventType: NetworkEventType;
}

export interface NetworkPage {
  events: NetworkEvent[];
  nextCursor: string | null;
}

export function presenceStatus(lastCheckInAt: string | null, now: number): PresenceStatus {
  if (!lastCheckInAt) return "not_reported";
  const seen = Date.parse(lastCheckInAt);
  if (!Number.isFinite(seen) || seen > now) return "not_reported";
  if (now - seen <= PRESENCE_RECENT_MS) return "recently_active";
  return "last_seen";
}

export function presenceLabel(status: PresenceStatus): string {
  if (status === "recently_active") return "Recently checked in";
  if (status === "last_seen") return "Last check-in";
  return "No check-ins reported";
}

export function formatCheckIn(value: string): string {
  const seen = Date.parse(value);
  if (!Number.isFinite(seen)) return value;
  return new Date(seen).toISOString();
}

export function networkEventLabel(eventType: NetworkEventType): string {
  if (eventType === "domain_verified") return "Domain verified";
  if (eventType === "profile_updated") return "Profile updated";
  return "Last check-in";
}

export function passportFor(identity: PublicIdentity): Record<string, unknown> {
  const base = {
    schemaVersion: "1.0",
    issuer: SITE_ORIGIN,
    publicId: identity.publicId,
    identityUrl: `${SITE_ORIGIN}${identity.identityUrl}`,
    lifecycle: identity.lifecycle,
    registered: true,
  };
  if (!isPublicAgentIdentity(identity)) return base;
  return {
    ...base,
    name: identity.name,
    description: identity.description,
    category: identity.category,
    capabilities: identity.capabilities,
    endpointUrl: identity.endpointUrl,
    claimedHost: identity.claimedHost,
    domainVerification: identity.domainVerification,
    verificationExpiresAt: identity.verificationExpiresAt,
    presence: {
      status: identity.presenceStatus,
      lastCheckInAt: identity.lastCheckInAt,
      source: "agent_self_reported",
    },
  };
}

export function networkCursor(event: Pick<NetworkEvent, "occurredAt" | "publicId" | "eventType">): string {
  return `${event.occurredAt}|${event.publicId}|${event.eventType}`;
}

export function parseNetworkCursor(value: string | null): { occurredAt: string; publicId: string; eventType: NetworkEventType } | null {
  if (value === null) return { occurredAt: "", publicId: "", eventType: "domain_verified" };
  const parts = value.split("|");
  if (parts.length !== 3) return null;
  const [occurredAt, publicId, eventType] = parts;
  if (!occurredAt || !Number.isFinite(Date.parse(occurredAt)) || !isPublicId(publicId) || !isNetworkEvent(eventType)) return null;
  return { occurredAt, publicId, eventType };
}

export function networkComesAfter(
  event: Pick<NetworkEvent, "occurredAt" | "publicId" | "eventType">,
  cursor: { occurredAt: string; publicId: string; eventType: NetworkEventType } | null,
): boolean {
  if (!cursor || cursor.occurredAt === "") return true;
  if (event.occurredAt !== cursor.occurredAt) return event.occurredAt < cursor.occurredAt;
  if (event.publicId !== cursor.publicId) return event.publicId < cursor.publicId;
  return event.eventType < cursor.eventType;
}

export function pageNetworkEvents(events: NetworkEvent[], cursor: string | null, limit: number): NetworkPage | null {
  const parsed = parseNetworkCursor(cursor);
  if (!parsed || limit < 1 || limit > 50) return null;
  const ordered = [...events].sort(compareNetworkEvents);
  const page = ordered.filter((event) => networkComesAfter(event, parsed)).slice(0, limit);
  const last = page[page.length - 1];
  return {
    events: page,
    nextCursor: page.length === limit && last ? networkCursor(last) : null,
  };
}

export function parseNetworkPage(value: unknown): NetworkPage | null {
  if (!isRecord(value) || !Array.isArray(value.events)) return null;
  if (value.nextCursor !== null && typeof value.nextCursor !== "string") return null;
  const events: NetworkEvent[] = [];
  for (const item of value.events) {
    const event = parseNetworkEvent(item);
    if (!event) return null;
    events.push(event);
  }
  return { events, nextCursor: typeof value.nextCursor === "string" ? value.nextCursor : null };
}

export function parseCheckIn(value: unknown, publicId: string): Record<string, unknown> | null {
  if (!isRecord(value) || value.publicId !== publicId) return null;
  if (value.accepted !== true && value.accepted !== false) return null;
  if (!isPresence(value.presenceStatus)) return null;
  if (typeof value.lastCheckInAt !== "string" || !Number.isFinite(Date.parse(value.lastCheckInAt))) return null;
  if (typeof value.nextRecommendedCheckInAt !== "string" || !Number.isFinite(Date.parse(value.nextRecommendedCheckInAt))) return null;
  return {
    publicId,
    accepted: value.accepted,
    lastCheckInAt: value.lastCheckInAt,
    presenceStatus: value.presenceStatus,
    nextRecommendedCheckInAt: value.nextRecommendedCheckInAt,
  };
}

function compareNetworkEvents(left: NetworkEvent, right: NetworkEvent): number {
  if (left.occurredAt !== right.occurredAt) return left.occurredAt < right.occurredAt ? 1 : -1;
  if (left.publicId !== right.publicId) return left.publicId < right.publicId ? 1 : -1;
  if (left.eventType === right.eventType) return 0;
  return left.eventType < right.eventType ? 1 : -1;
}

function parseNetworkEvent(value: unknown): NetworkEvent | null {
  if (!isRecord(value)) return null;
  const publicId = value.publicId;
  const occurredAt = value.occurredAt;
  const name = value.name;
  const eventType = value.eventType;
  if (typeof publicId !== "string" || !isPublicId(publicId)) return null;
  if (typeof occurredAt !== "string" || !Number.isFinite(Date.parse(occurredAt))) return null;
  if (typeof name !== "string" || name.length < 2 || name.length > 80) return null;
  if (!isNetworkEvent(eventType)) return null;
  if (value.identityUrl !== `/agents/${publicId}`) return null;
  return { occurredAt, publicId, identityUrl: `/agents/${publicId}`, name, eventType };
}

function isNetworkEvent(value: unknown): value is NetworkEventType {
  return NETWORK_EVENTS.some((event) => event === value);
}

function isPresence(value: unknown): value is PresenceStatus {
  return value === "recently_active" || value === "last_seen" || value === "not_reported";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
