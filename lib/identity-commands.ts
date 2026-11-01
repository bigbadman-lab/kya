import { platformClientAddress, rateLimitSubjects } from "./client-address.ts";
import { bearerManagementToken, isManagementToken } from "./credentials.ts";
import { readApiSearch, type RegistryQuery } from "./discovery.ts";
import type { TxtObservation } from "./dns-txt.ts";
import { jsonNoStore } from "./http.ts";
import { isPublicAgentIdentity, parseRegistrySearch, type IdentityRead, type PublicIdentity, type RegistrySearchResult } from "./identity.ts";
import {
  challengeIdParam,
  completionError,
  identityResult,
  issuedChallenge,
  issuedRegistration,
  jsonRecord,
  managementError,
  publicIdParam,
  rotatedCredential,
} from "./management-result.ts";
import { parseCheckIn, parseNetworkCursor, parseNetworkPage, passportFor } from "./presence.ts";
import { databaseErrorStatus, parseRegistration } from "./registration.ts";

export interface CommandResult {
  status: number;
  body: Record<string, unknown>;
}

export type IdentityRpcResult = { data: unknown } | { error: string };
export type IdentityRpc = (fn: string, args: Record<string, unknown>) => Promise<IdentityRpcResult>;
export type PublicLookup = (publicId: string) => Promise<IdentityRead<PublicIdentity | null>>;
export type PublicSearch = (query: RegistryQuery, limit: number) => Promise<IdentityRead<RegistrySearchResult>>;

const MISSING_TXT = {
  error: "kya_challenge_mismatch",
  message: "No TXT record was found at the challenge name. Publish it, wait for DNS, and try again. The challenge is still pending.",
};

export async function registerIdentity(
  input: { body: unknown; address: string | null },
  rpc: IdentityRpc,
): Promise<CommandResult> {
  const parsed = parseRegistration(input.body);
  if (!parsed.ok) {
    return failure(400, "kya_invalid", parsed.failure.message, parsed.failure.fields);
  }
  const subjects = input.address ? rateLimitSubjects(input.address) : null;
  if (!subjects) {
    return failure(503, "kya_unavailable", "Registration is unavailable because the client address could not be established.");
  }

  const result = await rpc("register_agent", {
    p_name: parsed.data.name,
    p_description: parsed.data.description,
    p_endpoint_url: parsed.data.endpointUrl,
    p_claimed_host: parsed.data.claimedHost,
    p_category: parsed.data.category,
    p_capabilities: parsed.data.capabilities,
    p_agent_card_url: parsed.data.agentCardUrl,
    p_owner_user_id: null,
    p_ip_subject: subjects.ipSubject,
    p_net_subject: subjects.netSubject,
  });
  if ("error" in result) {
    const mapped = databaseErrorStatus(result.error);
    if (!mapped) {
      console.error("KYA registration failed");
      return failure(503, "kya_unavailable", "Registration is unavailable.");
    }
    if (mapped.error === "kya_rate_limited" || mapped.error === "kya_unavailable" || mapped.error === "kya_collision") {
      console.error(`KYA registration ${mapped.error}`);
    }
    return failure(mapped.status, mapped.error, mapped.message);
  }

  const issued = issuedRegistration(result.data);
  if (!issued) {
    console.error("KYA registration returned an unexpected result");
    return failure(503, "kya_unavailable", "Registration is unavailable.");
  }
  return { status: 201, body: issued };
}

export function registrationAddress(headerValue: string | null, hostname: string, onVercel: boolean): string | null {
  return platformClientAddress(headerValue, hostname, onVercel);
}

export async function updateIdentity(
  input: { publicId: string; token: string; body: unknown },
  rpc: IdentityRpc,
): Promise<CommandResult> {
  const publicId = publicIdParam(input.publicId);
  if (!publicId) return failure(404, "kya_not_found", "The identity was not found.");
  const parsed = parseRegistration(input.body);
  if (!parsed.ok) return failure(400, "kya_invalid", parsed.failure.message, parsed.failure.fields);

  const result = await rpc("update_agent_metadata", {
    p_public_id: publicId,
    p_presented_token: input.token,
    p_actor_user_id: null,
    p_name: parsed.data.name,
    p_description: parsed.data.description,
    p_endpoint_url: parsed.data.endpointUrl,
    p_claimed_host: parsed.data.claimedHost,
    p_category: parsed.data.category,
    p_capabilities: parsed.data.capabilities,
    p_agent_card_url: parsed.data.agentCardUrl,
  });
  if ("error" in result) return rpcFailure(result.error, managementError, "The identity service is unavailable.");
  const identity = identityResult(result.data);
  if (!identity) {
    console.error("KYA management returned an unexpected result");
    return failure(503, "kya_unavailable", "The identity service is unavailable.");
  }
  return { status: 200, body: identityRecord(identity) };
}

export async function issueDnsChallenge(
  input: { publicId: string; token: string; method: unknown },
  rpc: IdentityRpc,
): Promise<CommandResult> {
  const publicId = publicIdParam(input.publicId);
  if (!publicId) return failure(404, "kya_not_found", "The identity was not found.");
  const method = input.method === undefined ? "dns_txt" : input.method;
  if (typeof method !== "string") return failure(400, "kya_invalid", "The verification method is not valid.");

  const result = await rpc("issue_dns_challenge", {
    p_public_id: publicId,
    p_presented_token: input.token,
    p_actor_user_id: null,
    p_method: method,
  });
  if ("error" in result) return rpcFailure(result.error, managementError, "The identity service is unavailable.");
  const issued = issuedChallenge(result.data);
  if (!issued) {
    console.error("KYA management returned an unexpected result");
    return failure(503, "kya_unavailable", "The identity service is unavailable.");
  }
  return { status: 201, body: issued };
}

export async function completeDnsVerification(
  input: { publicId: string; challengeId: string; token: string },
  deps: { rpc: IdentityRpc; lookup: PublicLookup; observe: (claimedHost: string) => Promise<TxtObservation> },
): Promise<CommandResult> {
  const publicId = publicIdParam(input.publicId);
  const challengeId = challengeIdParam(input.challengeId);
  if (!publicId || !challengeId) return failure(404, "kya_not_found", "The identity was not found.");

  const lookup = await deps.lookup(publicId);
  if (!lookup.ok) return failure(503, "kya_unavailable", "The identity service is unavailable.");
  if (!lookup.data || !isPublicAgentIdentity(lookup.data)) {
    return (await authorizeOnly(publicId, challengeId, input.token, deps.rpc))
      ?? failure(503, "kya_unavailable", "The identity service is unavailable.");
  }

  const authorized = await authorizeOnly(publicId, challengeId, input.token, deps.rpc);
  if (authorized) return authorized;

  const observed = await deps.observe(lookup.data.claimedHost);
  if (observed.status === "unavailable") {
    return failure(503, "kya_unavailable", "The DNS lookup did not succeed. The challenge is still pending.");
  }
  if (observed.status === "missing") return { status: 400, body: MISSING_TXT };

  const result = await deps.rpc("complete_dns_challenge", {
    p_public_id: publicId,
    p_presented_token: input.token,
    p_actor_user_id: null,
    p_challenge_id: challengeId,
    p_observed_txt_values: observed.values,
  });
  if ("error" in result) return rpcFailure(result.error, managementError, "The identity service is unavailable.");

  const record = jsonRecord(result.data);
  if (record && typeof record.error === "string") {
    const mapped = completionError(record.error);
    if (!mapped) {
      console.error("KYA management returned an unexpected result");
      return failure(503, "kya_unavailable", "The identity service is unavailable.");
    }
    return failure(mapped.status, mapped.error, mapped.message);
  }

  const identity = identityResult(result.data);
  if (!identity || !isPublicAgentIdentity(identity) || identity.domainVerification !== "verified") {
    console.error("KYA management returned an unexpected result");
    return failure(503, "kya_unavailable", "The identity service is unavailable.");
  }
  return { status: 200, body: identityRecord(identity) };
}

export async function rotateManagementCredential(
  input: { publicId: string; token: string },
  rpc: IdentityRpc,
): Promise<CommandResult> {
  const publicId = publicIdParam(input.publicId);
  if (!publicId) return failure(404, "kya_not_found", "The identity was not found.");
  const result = await rpc("rotate_management_credential", {
    p_public_id: publicId,
    p_presented_token: input.token,
    p_actor_user_id: null,
  });
  if ("error" in result) return rpcFailure(result.error, managementError, "The identity service is unavailable.");
  const rotated = rotatedCredential(result.data, publicId);
  if (!rotated) {
    console.error("KYA management returned an unexpected result");
    return failure(503, "kya_unavailable", "The identity service is unavailable.");
  }
  return { status: 200, body: rotated };
}

export async function lookupIdentity(publicId: string, lookup: PublicLookup): Promise<CommandResult> {
  const id = publicIdParam(publicId);
  if (!id) return failure(404, "kya_not_found", "The identity was not found.");
  const result = await lookup(id);
  if (!result.ok) return failure(503, "kya_unavailable", "The identity service is unavailable.");
  if (!result.data) return failure(404, "kya_not_found", "The identity was not found.");
  return { status: 200, body: identityRecord(result.data) };
}

export async function searchIdentities(url: URL, search: PublicSearch): Promise<CommandResult> {
  const parsed = readApiSearch(url);
  if (!parsed.ok) return failure(400, "kya_invalid", "The search is not valid.");
  const result = await search(parsed.data.query, parsed.data.limit);
  if (!result.ok) {
    if (result.reason === "invalid") return failure(400, "kya_invalid", "The search is not valid.");
    return failure(503, "kya_unavailable", "The identity service is unavailable.");
  }
  const checked = parseRegistrySearch(result.data);
  if (!checked) return failure(503, "kya_unavailable", "The identity service is unavailable.");
  return { status: 200, body: { agents: checked.agents, nextCursor: checked.nextCursor } };
}

export async function checkInIdentity(
  input: { publicId: string; token: string },
  rpc: IdentityRpc,
): Promise<CommandResult> {
  const publicId = publicIdParam(input.publicId);
  if (!publicId) return failure(404, "kya_not_found", "The identity was not found.");
  const result = await rpc("record_agent_check_in", {
    p_public_id: publicId,
    p_presented_token: input.token,
  });
  if ("error" in result) return rpcFailure(result.error, managementError, "The identity service is unavailable.");
  const checkIn = parseCheckIn(result.data, publicId);
  if (!checkIn) {
    console.error("KYA management returned an unexpected result");
    return failure(503, "kya_unavailable", "The identity service is unavailable.");
  }
  return { status: 200, body: checkIn };
}

export async function readPassport(publicId: string, lookup: PublicLookup): Promise<CommandResult> {
  const result = await lookupIdentity(publicId, lookup);
  if (result.status !== 200) return result;
  const identity = identityResult(result.body);
  if (!identity) return failure(503, "kya_unavailable", "The identity service is unavailable.");
  return { status: 200, body: passportFor(identity) };
}

export async function readNetworkActivity(
  input: { cursor: string | null; limit: number },
  rpc: IdentityRpc,
): Promise<CommandResult> {
  if (!parseNetworkCursor(input.cursor) || input.limit < 1 || input.limit > 50) {
    return failure(400, "kya_invalid", "The network query is not valid.");
  }
  const result = await rpc("search_public_network", {
    p_cursor: input.cursor,
    p_limit: input.limit,
  });
  if ("error" in result) return rpcFailure(result.error, managementError, "The network feed is unavailable.");
  const page = parseNetworkPage(result.data);
  if (!page) {
    console.error("KYA network feed returned an unexpected result");
    return failure(503, "kya_unavailable", "The network feed is unavailable.");
  }
  return { status: 200, body: { events: page.events, nextCursor: page.nextCursor } };
}

export function agentSearchResponse(url: URL, search: PublicSearch): Promise<Response> {
  return searchIdentities(url, search).then((result) => jsonNoStore(result.body, result.status));
}

export function resolveManagementCredential(header: string | null, provided: unknown): { token: string } | CommandResult {
  if (provided !== undefined && (typeof provided !== "string" || !isManagementToken(provided))) {
    return failure(401, "kya_unauthorized", "Send the management token as Authorization: Bearer or as the managementToken field.");
  }
  const argument = typeof provided === "string" ? provided : null;
  const headerToken = bearerManagementToken(header);
  if (argument && headerToken && argument !== headerToken) {
    return failure(401, "kya_unauthorized", "The management credential does not match.");
  }
  const token = argument ?? headerToken;
  if (!token) {
    return failure(401, "kya_unauthorized", "Send the management token as Authorization: Bearer or as the managementToken field.");
  }
  return { token };
}

async function authorizeOnly(publicId: string, challengeId: string, token: string, rpc: IdentityRpc): Promise<CommandResult | null> {
  const result = await rpc("complete_dns_challenge", {
    p_public_id: publicId,
    p_presented_token: token,
    p_actor_user_id: null,
    p_challenge_id: challengeId,
    p_observed_txt_values: [],
  });
  if (!("error" in result)) {
    console.error("KYA management returned an unexpected result");
    return failure(503, "kya_unavailable", "The identity service is unavailable.");
  }
  if (result.error === "kya_invalid") return null;
  return rpcFailure(result.error, managementError, "The identity service is unavailable.");
}

function rpcFailure(
  code: string,
  map: (message: string | undefined) => { status: number; error: string; message: string } | null,
  unavailable: string,
): CommandResult {
  const mapped = map(code);
  if (!mapped) {
    console.error("KYA identity command failed");
    return failure(503, "kya_unavailable", unavailable);
  }
  if (mapped.status === 429 || mapped.status === 503) console.error(`KYA identity ${mapped.error}`);
  return failure(mapped.status, mapped.error, mapped.message);
}

function failure(status: number, error: string, message: string, fields?: Record<string, string>): CommandResult {
  return { status, body: fields ? { error, message, fields } : { error, message } };
}

function identityRecord(identity: PublicIdentity): Record<string, unknown> {
  return { ...identity };
}
