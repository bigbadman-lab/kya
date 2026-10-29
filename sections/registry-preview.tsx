import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AgentCard } from "@/components/agent-card";
import { DemoNotice } from "@/components/demo-notice";
import { SectionFrame } from "@/components/section-frame";
import { DEMO_AGENTS, DEMO_NOTICE } from "@/data/demo-agents";

export function RegistryPreview() {
  const preview = DEMO_AGENTS.slice(0, 3);

  return (
    <SectionFrame id="registry" innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
      <p className="mb-5 text-sm text-zinc-100">- Registry</p>
      <h2 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
        A public index of agent identities.
      </h2>
      <p className="mt-4 max-w-xl text-sm/5.5 font-light text-zinc-400">
        Three illustrative cards from the shared sample set. They are not live registry activity.
      </p>
      <div className="mt-8 max-w-3xl">
        <DemoNotice>{DEMO_NOTICE}</DemoNotice>
      </div>
      <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {preview.map((agent) => (
          <li key={agent.id} className="min-w-0">
            <AgentCard agent={agent} />
          </li>
        ))}
      </ul>
      <Link href="/agents" className="mt-10 inline-flex items-center gap-1 text-sm text-white group">
        Explore the sample registry
        <ArrowUpRight size={18} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </SectionFrame>
  );
}
