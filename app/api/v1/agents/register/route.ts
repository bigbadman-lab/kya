import type { NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/admin-supabase";
import { platformClientAddress, rateLimitSubjects } from "@/lib/client-address";
import { parsePublicIdentity } from "@/lib/identity";
import {
  REGISTRATION_BODY_LIMIT,
  databaseErrorStatus,
  parseRegistration,
} from "@/lib/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const TOKEN = /^kya_mgmt_[0-9a-hjkmnp-tv-z]{52}$/;

export function GET() {
  return json({ error: "kya_invalid", message: "Use POST to register an agent." }, 405, { Allow: "POST" });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type");
  if (!isJsonContentType(contentType)) {
    return json({ error: "kya_invalid", message: "Send the registration as application/json." }, 400);
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && (!/^[0-9]+$/.test(declaredLength) || Number(declaredLength) > REGISTRATION_BODY_LIMIT)) {
    return json({ error: "kya_invalid", message: "The registration is larger than 8 KB." }, 400);
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > REGISTRATION_BODY_LIMIT) {
    return json({ error: "kya_invalid", message: "The registration is larger than 8 KB." }, 400);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return json({ error: "kya_invalid", message: "The registration body is not valid JSON." }, 400);
  }

  const parsed = parseRegistration(payload);
  if (!parsed.ok) {
    return json({ error: "kya_invalid", message: parsed.failure.message, fields: parsed.failure.fields }, 400);
  }

  const address = platformClientAddress(
    request.headers.get("x-real-ip"),
    request.nextUrl.hostname,
    process.env.VERCEL === "1",
  );
  const subjects = address ? rateLimitSubjects(address) : null;
  if (!subjects) {
    return json({ error: "kya_unavailable", message: "Registration is unavailable because the client address could not be established." }, 503);
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return json({ error: "kya_unavailable", message: "Registration is unavailable." }, 503);
  }

  const { data, error } = await supabase.rpc("register_agent", {
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

  if (error) {
    const mapped = databaseErrorStatus(error.message);
    if (!mapped) {
      console.error("KYA registration failed");
      return json({ error: "kya_unavailable", message: "Registration is unavailable." }, 503);
    }
    if (mapped.error === "kya_rate_limited" || mapped.error === "kya_unavailable" || mapped.error === "kya_collision") {
      console.error(`KYA registration ${mapped.error}`);
    }
    return json({ error: mapped.error, message: mapped.message }, mapped.status);
  }

  const issued = issuedRegistration(data);
  if (!issued) {
    console.error("KYA registration returned an unexpected result");
    return json({ error: "kya_unavailable", message: "Registration is unavailable." }, 503);
  }

  return json(issued, 201);
}

function issuedRegistration(value: unknown): Record<string, unknown> | null {
  const record = jsonRecord(value);
  if (!record || typeof record.managementToken !== "string" || !TOKEN.test(record.managementToken)) return null;
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
    dnsNextStep: `Domain verification is not available yet. When it opens, control of ${identity.claimedHost} is shown by a DNS TXT record at _kya-challenge.${identity.claimedHost}. This registration does not verify the domain and does not mean the agent is safe or trustworthy.`,
  };
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

function json(body: unknown, status: number, extra?: Record<string, string>) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}
