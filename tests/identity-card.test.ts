import assert from "node:assert/strict";
import { test } from "node:test";
import { fingerprint } from "../lib/fingerprint.ts";
import {
  cardFromIdentity,
  cardImageAccess,
  cardPngPath,
  embedSnippet,
  profileUrl,
  shareText,
  shareUrl,
  truncateCardText,
} from "../lib/identity-card.ts";
import type { PublicAgentIdentity, PublicIdentity } from "../lib/identity.ts";

const ID_A = "kya_0123456789abcdefghjkmnpqrs";
const ID_B = "kya_0123456789abcdefghjkmnpqrt";

function identity(overrides: Partial<PublicAgentIdentity> = {}): PublicAgentIdentity {
  return {
    publicId: ID_A,
    identityUrl: `/agents/${ID_A}`,
    name: "Field agent",
    description: "A public description of the agent.",
    category: "Research",
    capabilities: ["search", "summarize", "scheduling", "checkout"],
    endpointUrl: "https://agent.example/agent",
    claimedHost: "agent.example",
    lifecycle: "active",
    domainVerification: "unverified",
    verificationExpiresAt: null,
    presenceStatus: "not_reported",
    lastCheckInAt: null,
    registered: true,
    ...overrides,
  };
}

test("the fingerprint is stable for one id and different for another", () => {
  assert.deepEqual(fingerprint(ID_A), fingerprint(ID_A));
  assert.notDeepEqual(fingerprint(ID_A), fingerprint(ID_B));
  assert.ok(fingerprint(ID_A).nodes.length >= 8);
  assert.ok(fingerprint(ID_A).links.length >= fingerprint(ID_A).nodes.length);
});

test("registered and expired identities do not receive a verified badge", () => {
  const registered = cardFromIdentity(identity());
  assert.equal(registered.tone, "registered");
  assert.equal(registered.badge, "REGISTERED");
  assert.equal(registered.support, "Domain not verified");

  const expired = cardFromIdentity(identity({
    domainVerification: "expired",
    verificationExpiresAt: "2020-01-01T00:00:00.000Z",
  }));
  assert.equal(expired.tone, "registered");
  assert.equal(expired.badge, "REGISTERED");
  assert.equal(expired.support, "Not currently verified");
  assert.equal(expired.capabilities.length, 3);
  assert.equal(expired.extraCapabilities, 1);
});

test("verified styling requires a current expiry", () => {
  const now = Date.parse("2026-10-29T00:00:00.000Z");
  const current = cardFromIdentity(identity({
    domainVerification: "verified",
    verificationExpiresAt: "2026-12-01T00:00:00.000Z",
  }), now);
  assert.equal(current.tone, "verified");
  assert.equal(current.badge, "DOMAIN VERIFIED");

  const stale = cardFromIdentity(identity({
    domainVerification: "verified",
    verificationExpiresAt: "2026-10-01T00:00:00.000Z",
  }), now);
  assert.equal(stale.tone, "registered");
  assert.equal(stale.badge, "REGISTERED");
});

test("long names truncate and the public id stays complete", () => {
  const name = "A".repeat(80);
  const card = cardFromIdentity(identity({ name }));
  assert.ok(card.name);
  assert.ok(card.name.length < name.length);
  assert.match(card.name, /…$/);
  assert.equal(card.publicId, ID_A);
  assert.equal(truncateCardText("short", 48), "short");
});

test("tombstones expose only the public inactive record", () => {
  const tombstone: PublicIdentity = {
    publicId: ID_A,
    identityUrl: `/agents/${ID_A}`,
    lifecycle: "revoked",
    registered: true,
  };
  const card = cardFromIdentity(tombstone);
  assert.equal(card.tone, "inactive");
  assert.equal(card.badge, "REVOKED");
  assert.equal(card.name, null);
  assert.equal(card.host, null);
  assert.deepEqual(card.capabilities, []);
  assert.equal(shareText(card).includes("verified"), false);
});

test("image access rejects invalid ids and mismatched records", () => {
  const verified = identity({
    domainVerification: "verified",
    verificationExpiresAt: "2027-01-01T00:00:00.000Z",
  });
  const invalid = cardImageAccess("kya_not-valid", { ok: true, data: verified });
  assert.equal(invalid.status, 404);
  assert.equal(invalid.card, null);
  assert.equal(invalid.cacheControl, "no-store");

  const missing = cardImageAccess(ID_A, { ok: true, data: null });
  assert.equal(missing.status, 404);

  const mismatch = cardImageAccess(ID_A, { ok: true, data: identity({ publicId: ID_B, identityUrl: `/agents/${ID_B}` }) });
  assert.equal(mismatch.status, 404);

  const unavailable = cardImageAccess(ID_A, { ok: false, reason: "unavailable" });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.card, null);
});

test("embed and share links use the public profile and never a credential", () => {
  const card = cardFromIdentity(identity({ name: `Agent <script> "quoted"` }));
  const embed = embedSnippet(card);
  assert.ok(embed);
  assert.match(embed, new RegExp(`href="${profileUrl(card.profilePath ?? "")}"`));
  assert.match(embed, new RegExp(`src="https://knowyouragent.fun${cardPngPath(ID_A)}"`));
  assert.match(embed, /width="1200"/);
  assert.match(embed, /height="630"/);
  assert.doesNotMatch(embed, /<script>/);
  assert.match(embed, /&lt;script&gt;/);
  assert.doesNotMatch(embed, /kya_mgmt_|managementToken|token=/);

  const share = shareUrl(card);
  assert.ok(share);
  assert.match(share, /^https:\/\/x\.com\/intent\/tweet\?/);
  assert.equal(shareText(card), `Agent <script> "quoted" is registered on KYA. Domain verification is not current.`);
  assert.match(share, /url=https%3A%2F%2Fknowyouragent\.fun%2Fagents%2Fkya_0123456789abcdefghjkmnpqrs/);
  assert.doesNotMatch(share, /kya_mgmt_/);

  const verified = cardFromIdentity(identity({
    domainVerification: "verified",
    verificationExpiresAt: "2027-01-01T00:00:00.000Z",
  }), Date.parse("2026-10-29T00:00:00.000Z"));
  assert.match(shareText(verified), /current domain verification/);
});
