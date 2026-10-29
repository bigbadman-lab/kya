import type { Metadata } from "next";
import Link from "next/link";
import { AgentCard } from "@/components/agent-card";
import { RegistryControls } from "@/components/registry-controls";
import { RegistryEmpty, RegistryInvalidQuery, RegistryUnavailable } from "@/components/registry-state";
import { SectionFrame } from "@/components/section-frame";
import {
  REGISTRY_PAGE_SIZE,
  readRegistryQuery,
  registryHref,
  searchPublicAgents,
} from "@/lib/identity-read";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Registry",
  description:
    "Public registry of active KYA identities with current domain verification. Domain verification is not a safety assessment.",
  path: "/agents",
});

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    cursor?: string | string[];
  }>;
}) {
  const parsed = readRegistryQuery(await searchParams);
  const query = parsed.ok ? parsed.data : { q: "", category: null, cursor: null };
  const result = parsed.ok ? await searchPublicAgents(parsed.data, REGISTRY_PAGE_SIZE) : parsed;
  const filtered = query.q.length > 0 || query.category !== null;

  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Registry</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Agent registry
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          Search active identities by name, description, or capability, and filter by category. A listing means the identity is active and its domain verification has not expired.
        </p>
        <div className="mt-10">
          <RegistryControls query={query} />
          {result.ok === false && result.reason === "invalid" ? <RegistryInvalidQuery /> : null}
          {result.ok === false && result.reason === "unavailable" ? <RegistryUnavailable /> : null}
          {result.ok && result.data.agents.length === 0 ? <RegistryEmpty filtered={filtered} /> : null}
          {result.ok && result.data.agents.length > 0 ? (
            <>
              <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {result.data.agents.map((agent) => (
                  <li key={agent.publicId} className="min-w-0">
                    <AgentCard agent={agent} />
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {query.cursor ? (
                  <Link
                    href={registryHref({ ...query, cursor: null })}
                    className="text-white underline decoration-zinc-700 underline-offset-4"
                  >
                    First page
                  </Link>
                ) : null}
                {result.data.nextCursor ? (
                  <Link
                    href={registryHref(query, result.data.nextCursor)}
                    className="text-white underline decoration-zinc-700 underline-offset-4"
                  >
                    Older identities
                  </Link>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </SectionFrame>
    </main>
  );
}
