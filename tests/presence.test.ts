import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { unknownJsonFields } from "../lib/http.ts";
import { parsePublicIdentity } from "../lib/identity.ts";
import { checkInIdentity, readNetworkActivity, readPassport, updateIdentity } from "../lib/identity-commands.ts";
import {
  HEARTBEAT_BODY_FIELDS,
  PRESENCE_RECENT_MS,
  pageNetworkEvents,
  parseCheckIn,
  parseNetworkPage,
  passportFor,
  presenceLabel,
  presenceStatus,
  type NetworkEvent,
} from "../lib/presence.ts";

const PUBLIC_ID = `kya_${"a".repeat(26)}`;
const OTHER_ID = `kya_${"b".repeat(26)}`;
const TOKEN = `kya_mgmt_${"a".repeat(52)}`;
const NOW = Date.parse("2026-11-01T12:00:00.000Z");

function event(occurredAt: string, publicId: string, eventType: NetworkEvent["eventType"]): NetworkEvent {
  return {
    occurredAt,
    publicId,
    identityUrl: `/agents/${publicId}`,
    name: "Example agent",
    eventType,
  };
}

function activeIdentity() {
  return {
    publicId: PUBLIC_ID,
    identityUrl: `/agents/${PUBLIC_ID}`,
    name: "Example agent",
    description: "A public description of the agent.",
    category: "Research" as const,
    capabilities: ["search" as const],
    endpointUrl: "https://agent.example/agent",
    claimedHost: "agent.example",
    lifecycle: "active" as const,
    domainVerification: "verified" as const,
    verificationExpiresAt: "2027-01-01T00:00:00.000Z",
    presenceStatus: "recently_active" as const,
    lastCheckInAt: "2026-11-01T11:50:00.000Z",
    registered: true as const,
  };
}

describe("presence status", () => {
  it("uses a 15 minute boundary and rejects a future or missing time", () => {
    assert.equal(presenceStatus(new Date(NOW - PRESENCE_RECENT_MS).toISOString(), NOW), "recently_active");
    assert.equal(presenceStatus(new Date(NOW - PRESENCE_RECENT_MS - 1).toISOString(), NOW), "last_seen");
    assert.equal(presenceStatus(new Date(NOW + 1).toISOString(), NOW), "not_reported");
    assert.equal(presenceStatus(null, NOW), "not_reported");
    assert.equal(presenceLabel("recently_active"), "Recently checked in");
    assert.equal(presenceLabel("last_seen"), "Last check-in");
    assert.equal(presenceLabel("not_reported"), "No check-ins reported");
  });

  it("defaults a record without presence keys and fails closed when the keys disagree", () => {
    const legacy = parsePublicIdentity({
      publicId: PUBLIC_ID,
      identityUrl: `/agents/${PUBLIC_ID}`,
      name: "Example agent",
      description: "A public description of the agent.",
      category: "Research",
      capabilities: ["search"],
      endpointUrl: "https://agent.example/agent",
      claimedHost: "agent.example",
      lifecycle: "active",
      domainVerification: "unverified",
      verificationExpiresAt: null,
      registered: true,
    });
    assert.equal(legacy && "presenceStatus" in legacy ? legacy.presenceStatus : "missing", "not_reported");
    assert.equal(legacy && "lastCheckInAt" in legacy ? legacy.lastCheckInAt : "missing", null);

    const oneKey = parsePublicIdentity({ ...activeIdentity(), lastCheckInAt: undefined });
    assert.equal(oneKey, null);
    const mismatched = parsePublicIdentity({ ...activeIdentity(), presenceStatus: "not_reported", lastCheckInAt: "2026-11-01T11:50:00.000Z" });
    assert.equal(mismatched, null);
  });
});

describe("passport", () => {
  it("keeps a tombstone limited and omits credentials", () => {
    const active = passportFor(activeIdentity());
    assert.equal(active.schemaVersion, "1.0");
    assert.equal(active.issuer, "https://knowyouragent.fun");
    assert.equal(active.identityUrl, `https://knowyouragent.fun/agents/${PUBLIC_ID}`);
    const presence = active.presence as { source?: string; status?: string };
    assert.equal(presence.source, "agent_self_reported");
    assert.equal(presence.status, "recently_active");

    const tombstone = passportFor({
      publicId: PUBLIC_ID,
      identityUrl: `/agents/${PUBLIC_ID}`,
      lifecycle: "revoked",
      registered: true,
    });
    assert.deepEqual(Object.keys(tombstone).sort(), ["identityUrl", "issuer", "lifecycle", "publicId", "registered", "schemaVersion"]);
    assert.equal(JSON.stringify(tombstone).includes("managementToken"), false);
    assert.equal(JSON.stringify(active).includes("managementToken"), false);
  });

  it("returns not found without a lookup when the id is invalid", async () => {
    let calls = 0;
    const missing = await readPassport("not-an-id", async () => {
      calls += 1;
      return { ok: true, data: null };
    });
    assert.equal(missing.status, 404);
    assert.equal(calls, 0);
  });
});

describe("network cursor", () => {
  it("pages in descending order without a duplicate or a skip", () => {
    const events = [
      event("2026-11-01T00:01:00.000Z", OTHER_ID, "last_check_in"),
      event("2026-11-01T00:03:00.000Z", PUBLIC_ID, "profile_updated"),
      event("2026-11-01T00:03:00.000Z", PUBLIC_ID, "last_check_in"),
      event("2026-11-01T00:03:00.000Z", OTHER_ID, "domain_verified"),
      event("2026-11-01T00:02:00.000Z", PUBLIC_ID, "domain_verified"),
    ];
    const first = pageNetworkEvents(events, null, 2);
    const second = pageNetworkEvents(events, first?.nextCursor ?? null, 2);
    const third = pageNetworkEvents(events, second?.nextCursor ?? null, 2);
    const seen = [...(first?.events ?? []), ...(second?.events ?? []), ...(third?.events ?? [])];
    assert.equal(seen.length, 5);
    assert.equal(new Set(seen.map((item) => `${item.occurredAt}|${item.publicId}|${item.eventType}`)).size, 5);
    assert.equal(third?.nextCursor, null);
    assert.equal(seen[0]?.publicId, OTHER_ID);
    assert.equal(seen[0]?.eventType, "domain_verified");
    assert.equal(seen[1]?.eventType, "profile_updated");
  });

  it("rejects an unverified registration event and an unknown event type", () => {
    const created = parseNetworkPage({
      events: [{ ...event("2026-11-01T00:01:00.000Z", PUBLIC_ID, "domain_verified"), eventType: "created" }],
      nextCursor: null,
    });
    assert.equal(created, null);
    const wrongUrl = parseNetworkPage({
      events: [{ ...event("2026-11-01T00:01:00.000Z", PUBLIC_ID, "domain_verified"), identityUrl: "/network" }],
      nextCursor: null,
    });
    assert.equal(wrongUrl, null);
  });
});

describe("check-in command", () => {
  it("maps credential failures and keeps an early repeat as an accepted false result", async () => {
    const forbidden = await checkInIdentity({ publicId: PUBLIC_ID, token: TOKEN }, async () => ({ error: "kya_forbidden" }));
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.error, "kya_forbidden");

    const unauthorized = await checkInIdentity({ publicId: PUBLIC_ID, token: TOKEN }, async () => ({ error: "kya_unauthorized" }));
    assert.equal(unauthorized.status, 401);

    const limited = await checkInIdentity({ publicId: PUBLIC_ID, token: TOKEN }, async () => ({ error: "kya_rate_limited" }));
    assert.equal(limited.status, 429);

    const early = await checkInIdentity({ publicId: PUBLIC_ID, token: TOKEN }, async () => ({
      data: {
        publicId: PUBLIC_ID,
        accepted: false,
        lastCheckInAt: "2026-11-01T11:59:30.000Z",
        presenceStatus: "recently_active",
        nextRecommendedCheckInAt: "2026-11-01T12:04:30.000Z",
      },
    }));
    assert.equal(early.status, 200);
    assert.equal(early.body.accepted, false);
    assert.equal(parseCheckIn(early.body, OTHER_ID), null);
  });

  it("rejects a client timestamp in the heartbeat allowlist", () => {
    assert.deepEqual(unknownJsonFields({ lastCheckInAt: "2026-11-01T12:00:00.000Z" }, HEARTBEAT_BODY_FIELDS), ["lastCheckInAt"]);
    assert.deepEqual(unknownJsonFields({}, HEARTBEAT_BODY_FIELDS), []);
  });

  it("does not record a check-in when a profile is updated", async () => {
    const calls: string[] = [];
    const result = await updateIdentity({
      publicId: PUBLIC_ID,
      token: TOKEN,
      body: {
        name: "Example agent",
        description: "A public description of the agent.",
        endpointUrl: "https://agent.example/agent",
        category: "Research",
        capabilities: ["search"],
      },
    }, async (fn) => {
      calls.push(fn);
      return { data: activeIdentity() };
    });
    assert.equal(result.status, 200);
    assert.deepEqual(calls, ["update_agent_metadata"]);
  });

  it("rejects a network cursor that is not three parts", async () => {
    let calls = 0;
    const result = await readNetworkActivity({ cursor: "not-a-cursor", limit: 20 }, async () => {
      calls += 1;
      return { data: { events: [], nextCursor: null } };
    });
    assert.equal(result.status, 400);
    assert.equal(calls, 0);
  });
});
