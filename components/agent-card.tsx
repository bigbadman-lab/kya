import Link from "next/link";
import { domainVerificationLabel, type PublicAgentIdentity } from "@/lib/identity";

export function AgentCard({ agent }: { agent: PublicAgentIdentity }) {
  return (
    <Link
      href={agent.identityUrl}
      className="flex h-full flex-col border border-dashed border-zinc-800 p-5 transition-colors duration-200 hover:bg-zinc-950/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <p className="text-xs text-zinc-500">{domainVerificationLabel(agent.domainVerification)}</p>
      <h3 className="mt-3 text-base text-zinc-50">{agent.name}</h3>
      <p className="mt-2 text-sm/5.5 font-light text-zinc-400">{agent.description}</p>
      <dl className="mt-5 space-y-2 text-xs text-zinc-400">
        <div>
          <dt className="text-zinc-500">Identity</dt>
          <dd className="mt-0.5 break-all font-mono text-zinc-300">{agent.publicId}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Claimed domain</dt>
          <dd className="mt-0.5 break-all text-zinc-300">{agent.claimedHost}</dd>
        </div>
      </dl>
      <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        {agent.capabilities.map((capability) => (
          <li key={capability}>{capability}</li>
        ))}
      </ul>
    </Link>
  );
}
