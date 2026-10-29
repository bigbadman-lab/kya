import { AGENT_CATEGORIES, type AgentCategory } from "./identity.ts";

export const REGISTRY_PAGE_SIZE = 20;
export const REGISTRY_PREVIEW_SIZE = 3;
export const SEARCH_MAX_LIMIT = 50;

const CURSOR = /^[0-9T:Z.+ -]{20,40}$/;
const SEARCH_PARAMS = ["q", "category", "cursor", "limit"] as const;

export interface RegistryQuery {
  q: string;
  category: AgentCategory | null;
  cursor: string | null;
}

export type DiscoveryRead<T> = { ok: true; data: T } | { ok: false; reason: "invalid" };

function first(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

export function readRegistryQuery(input: {
  q?: string | string[];
  category?: string | string[];
  cursor?: string | string[];
}): DiscoveryRead<RegistryQuery> {
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

export function readSearchLimit(value: string | null): number | null {
  if (value == null || value === "") return REGISTRY_PAGE_SIZE;
  if (!/^[0-9]+$/.test(value)) return null;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_MAX_LIMIT) return null;
  return limit;
}

export function readApiSearch(url: URL): DiscoveryRead<{ query: RegistryQuery; limit: number }> {
  for (const key of url.searchParams.keys()) {
    if (!SEARCH_PARAMS.some((name) => name === key)) return { ok: false, reason: "invalid" };
  }
  const parsed = readRegistryQuery({
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.ok) return parsed;
  const limit = readSearchLimit(url.searchParams.get("limit"));
  if (limit == null) return { ok: false, reason: "invalid" };
  return { ok: true, data: { query: parsed.data, limit } };
}

export function registryHref(query: RegistryQuery, cursor?: string | null): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (cursor) params.set("cursor", cursor);
  const search = params.toString();
  return search ? `/agents?${search}` : "/agents";
}
