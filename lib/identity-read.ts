import "server-only";

import { connection } from "next/server";
import {
  type IdentityRead,
  type PublicIdentity,
  type RegistrySearchResult,
  parsePublicIdentity,
  parseRegistrySearch,
} from "@/lib/identity";
import { parseNetworkPage, type NetworkPage } from "@/lib/presence";
import { type RegistryQuery } from "@/lib/discovery";
import { parseStoredInspection, type PublicInspection } from "@/lib/inspector";
import { createPublicSupabase } from "@/lib/public-supabase";

export {
  REGISTRY_PAGE_SIZE,
  REGISTRY_PREVIEW_SIZE,
  readRegistryQuery,
  registryHref,
  type RegistryQuery,
} from "@/lib/discovery";

function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
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

export async function searchPublicNetwork(
  cursor: string | null,
  limit: number,
): Promise<IdentityRead<NetworkPage>> {
  await connection();
  const supabase = createPublicSupabase();
  if (!supabase) return { ok: false, reason: "unavailable" };
  const { data, error } = await supabase.rpc("search_public_network", {
    p_cursor: cursor,
    p_limit: limit,
  });
  if (error) return { ok: false, reason: "unavailable" };
  const page = parseNetworkPage(jsonValue(data));
  if (!page) return { ok: false, reason: "unavailable" };
  return { ok: true, data: page };
}
