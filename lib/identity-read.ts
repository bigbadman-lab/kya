import "server-only";

import { connection } from "next/server";
import {
  AGENT_CATEGORIES,
  type AgentCategory,
  type IdentityRead,
  type PublicIdentity,
  type RegistrySearchResult,
  parsePublicIdentity,
  parseRegistrySearch,
} from "@/lib/identity";
import { parseStoredInspection, type PublicInspection } from "@/lib/inspector";
import { createPublicSupabase } from "@/lib/public-supabase";

export const REGISTRY_PAGE_SIZE = 20;
export const REGISTRY_PREVIEW_SIZE = 3;

const CURSOR = /^[0-9T:Z.+ -]{20,40}$/;

function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export interface RegistryQuery {
  q: string;
  category: AgentCategory | null;
  cursor: string | null;
}

function first(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

export function readRegistryQuery(input: {
  q?: string | string[];
  category?: string | string[];
  cursor?: string | string[];
}): IdentityRead<RegistryQuery> {
  const q = first(input.q);
  const category = first(input.category);
  const cursor = first(input.cursor);

  if (q.length > 200) return { ok: false, reason: "invalid" };
  if (category && !AGENT_CATEGORIES.some((item) => item === category)) {
    return { ok: false, reason: "invalid" };
  }
  if (cursor && (!CURSOR.test(cursor) || !Number.isFinite(Date.parse(cursor)))) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    data: {
      q,
      category: category ? (category as AgentCategory) : null,
      cursor: cursor || null,
    },
  };
}

export function registryHref(query: RegistryQuery, cursor?: string | null): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (cursor) params.set("cursor", cursor);
  const search = params.toString();
  return search ? `/agents?${search}` : "/agents";
}

export async function lookupPublicAgent(publicId: string): Promise<IdentityRead<PublicIdentity | null>> {
  await connection();
  const supabase = createPublicSupabase();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const { data, error } = await supabase.rpc("lookup_public_agent", {
    p_public_id: publicId,
  });
  if (error) return { ok: false, reason: "unavailable" };
  if (data === null) return { ok: true, data: null };

  const identity = parsePublicIdentity(jsonValue(data));
  if (!identity) return { ok: false, reason: "unavailable" };
  return { ok: true, data: identity };
}

export async function lookupInspectorReport(publicId: string): Promise<PublicInspection> {
  await connection();
  const supabase = createPublicSupabase();
  if (!supabase) return { status: "unavailable" };

  const { data, error } = await supabase.rpc("lookup_inspector_report", {
    p_public_id: publicId,
  });
  if (error || data == null) return { status: "unavailable" };
  const report = parseStoredInspection(jsonValue(data));
  return report ?? { status: "unavailable" };
}

export async function searchPublicAgents(
  query: RegistryQuery,
  limit: number,
): Promise<IdentityRead<RegistrySearchResult>> {
  await connection();
  if (limit < 1 || limit > 50) return { ok: false, reason: "invalid" };

  const supabase = createPublicSupabase();
  if (!supabase) return { ok: false, reason: "unavailable" };

  const { data, error } = await supabase.rpc("search_public_agents", {
    p_query: query.q || null,
    p_category: query.category,
    p_cursor: query.cursor,
    p_limit: limit,
  });
  if (error) return { ok: false, reason: "unavailable" };

  const result = parseRegistrySearch(jsonValue(data));
  if (!result) return { ok: false, reason: "unavailable" };
  return { ok: true, data: result };
}
