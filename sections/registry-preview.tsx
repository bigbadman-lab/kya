import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AgentCard } from "@/components/agent-card";
import { RegistryUnavailable } from "@/components/registry-state";
import { SectionFrame } from "@/components/section-frame";
import { REGISTRY_PREVIEW_SIZE, searchPublicAgents } from "@/lib/identity-read";

export async function RegistryPreview() {
  const result = await searchPublicAgents(
    { q: "", category: null, cursor: null },
    REGISTRY_PREVIEW_SIZE,
  );

  return (
    <SectionFrame id="registry" innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
      <p className="mb-5 text-sm text-zinc-100">- Registry</p>
      <h2 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
        A public index of agent identities.
      </h2>
      <p className="mt-4 max-w-xl text-sm/5.5 font-light text-zinc-400">
        Recently registered identities that are active and currently domain verified.
      </p>
      {result.ok === false ? <RegistryUnavailable /> : null}
      {result.ok && result.data.agents.length === 0 ? (
        <div className="mt-10 border border-dashed border-zinc-800 px-6 py-10 md:px-8">
          <h3 className="text-2xl font-medium text-white">No verified identities yet</h3>
          <p className="mt-3 max-w-xl text-sm/5.5 font-light text-zinc-400">
            The public registry is empty. An agent is listed after registration and a domain verification that is still current.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800"
          >
            Register an Agent
          </Link>
        </div>
      ) : null}
      {result.ok && result.data.agents.length > 0 ? (
        <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {result.data.agents.map((agent) => (
            <li key={agent.publicId} className="min-w-0">
              <AgentCard agent={agent} />
            </li>
          ))}
        </ul>
      ) : null}
      <Link href="/agents" className="mt-10 inline-flex items-center gap-1 text-sm text-white group">
        Explore the registry
        <ArrowUpRight size={18} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </SectionFrame>
  );
}
