import { AGENT_CAPABILITIES, AGENT_CATEGORIES, type AgentCapability, type AgentCategory } from "@/lib/identity";
import { isPublicHostname } from "@/lib/client-address";

export const REGISTRATION_BODY_LIMIT = 8192;

export const REGISTRATION_FIELDS = [
  "name",
  "description",
  "endpointUrl",
  "category",
  "capabilities",
  "agentCardUrl",
] as const;

export interface RegistrationInput {
  name: string;
  description: string;
  endpointUrl: string;
  claimedHost: string;
  category: AgentCategory;
  capabilities: AgentCapability[];
  agentCardUrl: string | null;
}

export interface RegistrationFailure {
  message: string;
  fields: Record<string, string>;
}

const CONTROL = /[\u0000-\u001f\u007f]/;

export function registrationFailure(fields: Record<string, string>): RegistrationFailure {
  return { message: "The registration is not valid.", fields };
}

export function parseRegistration(value: unknown): { ok: true; data: RegistrationInput } | { ok: false; failure: RegistrationFailure } {
  if (!isRecord(value) || Array.isArray(value)) {
    return { ok: false, failure: registrationFailure({ body: "Send a JSON object." }) };
  }

  const unknown = Object.keys(value).filter((key) => !REGISTRATION_FIELDS.some((field) => field === key));
  if (unknown.length > 0) {
    return { ok: false, failure: registrationFailure({ body: "The request contains a field that registration does not accept." }) };
  }

  const fields: Record<string, string> = {};
  const name = cleanText(value.name, 2, 80);
  const description = cleanText(value.description, 10, 500);
  const endpoint = typeof value.endpointUrl === "string" ? httpsUrl(value.endpointUrl) : { error: "Enter an https endpoint." };
  const category = value.category;
  const capabilities = parseCapabilities(value.capabilities);
  const card = value.agentCardUrl === undefined || value.agentCardUrl === null || value.agentCardUrl === ""
    ? null
    : typeof value.agentCardUrl === "string"
      ? httpsUrl(value.agentCardUrl)
      : { error: "Agent Card URL must be an https URL." };

  if (!name) fields.name = "Enter a name of 2 to 80 characters.";
  if (!description) fields.description = "Enter a description of 10 to 500 characters.";
  if ("error" in endpoint) fields.endpointUrl = endpoint.error;
  if (!isCategory(category)) fields.category = "Select a supported category.";
  if (!capabilities) fields.capabilities = "Select 1 to 12 supported capabilities, without duplicates.";
  if (card && "error" in card) fields.agentCardUrl = card.error;

  if (Object.keys(fields).length > 0 || !name || !description || "error" in endpoint || !isCategory(category) || !capabilities || (card && "error" in card)) {
    return { ok: false, failure: registrationFailure(fields) };
  }

  return {
    ok: true,
    data: {
      name,
      description,
      endpointUrl: endpoint.url,
      claimedHost: endpoint.host,
      category,
      capabilities,
      agentCardUrl: card ? card.url : null,
    },
  };
}

export function databaseErrorStatus(message: string | undefined): { status: number; error: string; message: string } | null {
  switch (message) {
    case "kya_invalid":
      return { status: 400, error: message, message: "The registration is not valid." };
    case "kya_unauthorized":
      return { status: 401, error: message, message: "Registration could not be authorized." };
    case "kya_forbidden":
      return { status: 403, error: message, message: "Registration was refused." };
    case "kya_not_found":
      return { status: 404, error: message, message: "The identity was not found." };
    case "kya_conflict":
    case "kya_collision":
      return { status: 409, error: message, message: "The identity could not be issued. Try again." };
    case "kya_rate_limited":
      return { status: 429, error: message, message: "Registration is temporarily limited for this network. Try again later." };
    case "kya_unavailable":
      return { status: 503, error: message, message: "Registration is unavailable." };
    case "kya_not_implemented":
      return { status: 501, error: message, message: "That operation is not available." };
    default:
      return null;
  }
}

function cleanText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string" || CONTROL.test(value)) return null;
  const cleaned = value.trim();
  if (cleaned.length < min || cleaned.length > max) return null;
  return cleaned;
}

function isCategory(value: unknown): value is AgentCategory {
  return AGENT_CATEGORIES.some((category) => category === value);
}

function parseCapabilities(value: unknown): AgentCapability[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) return null;
  const seen = new Set<string>();
  const capabilities: AgentCapability[] = [];
  for (const item of value) {
    if (!AGENT_CAPABILITIES.some((capability) => capability === item) || seen.has(item)) return null;
    seen.add(item);
    capabilities.push(item);
  }
  return capabilities;
}

function httpsUrl(raw: string): { url: string; host: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048 || /[\u0000-\u001f\u007f\s\\#]/.test(trimmed)) {
    return { error: "Enter an https URL without spaces or a fragment." };
  }
  if (!trimmed.toLowerCase().startsWith("https://")) {
    return { error: "The URL must start with https://." };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { error: "Enter a valid https URL." };
  }
  if (parsed.username || parsed.password) {
    return { error: "The URL cannot include a username or password." };
  }
  if (parsed.port && parsed.port !== "443") {
    return { error: "The URL cannot use a port other than 443." };
  }
  const host = (parsed.hostname.endsWith(".") ? parsed.hostname.slice(0, -1) : parsed.hostname).toLowerCase();
  if (!isPublicHostname(host)) {
    return { error: "Use a public hostname, not an IP address or a local name." };
  }
  const authorityEnd = trimmed.indexOf("://") + 3;
  const restAt = trimmed.slice(authorityEnd).search(/[/?]/);
  const rest = restAt === -1 ? "" : `${parsed.pathname}${parsed.search}`;
  return { url: `https://${host}${rest}`, host };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
