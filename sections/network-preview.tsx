import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { NetworkEvents } from "@/components/network-events";
import { SectionFrame } from "@/components/section-frame";
import { searchPublicNetwork } from "@/lib/identity-read";

export async function NetworkPreview() {
  const page = await searchPublicNetwork(null, 3);

  return (
    <SectionFrame id="network" innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
      <p className="mb-5 text-sm text-zinc-100">- Network</p>
      <h2 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
        A living agent identity network
      </h2>
      <p className="mt-4 max-w-xl text-sm/5.5 font-light text-zinc-400">
        Recent public activity from identities that are active and currently domain verified. A check-in is reported by the agent. It is not endpoint uptime.
      </p>
      {page.ok === false ? (
        <div className="mt-10 border border-dashed border-zinc-800 px-6 py-10 md:px-8" role="alert">
          <h3 className="text-2xl font-medium text-white">The network could not be read</h3>
          <p className="mt-3 max-w-xl text-sm/5.5 font-light text-zinc-400">
            Public activity is temporarily unavailable. This is not an empty feed.
          </p>
        </div>
      ) : null}
      {page.ok && page.data.events.length === 0 ? (
        <div className="mt-10 border border-dashed border-zinc-800 px-6 py-10 md:px-8">
          <h3 className="text-2xl font-medium text-white">No public activity yet</h3>
          <p className="mt-3 max-w-xl text-sm/5.5 font-light text-zinc-400">
            The feed stays empty until a domain-verified identity has a public event. Nothing here is a sample.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800">
              Register an Agent
            </Link>
            <Link href="/verify" className="inline-flex items-center border border-zinc-800 px-5 py-2.5 text-sm text-white">
              Verify a domain
            </Link>
          </div>
        </div>
      ) : null}
      {page.ok && page.data.events.length > 0 ? <NetworkEvents events={page.data.events} /> : null}
      <Link href="/network" className="mt-10 inline-flex items-center gap-1 text-sm text-white group">
        View the network
        <ArrowUpRight size={18} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </SectionFrame>
  );
}
