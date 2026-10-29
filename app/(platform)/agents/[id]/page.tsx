import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyIdentityUrl } from "@/components/copy-identity-url";
import { DemoNotice } from "@/components/demo-notice";
import { SectionFrame } from "@/components/section-frame";
import { DEMO_AGENTS, DEMO_NOTICE, getDemoAgent, statusLabel } from "@/data/demo-agents";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return DEMO_AGENTS.map((agent) => ({ id: agent.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const agent = getDemoAgent(id);
  if (!agent) return { title: "Agent not found" };
  return {
    title: agent.name,
    description: `Illustrative KYA sample for ${agent.name}. This is not a live identity or a safety assessment.`,
  };
}

export default async function AgentProfilePage({ params }: PageProps) {
  const { id } = await params;
  const agent = getDemoAgent(id);
  if (!agent) notFound();

  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Sample identity</p>
        <h1 className="max-w-3xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          {agent.name}
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">{agent.description}</p>
        <p className="mt-4 text-xs text-zinc-500">{agent.category}</p>
        <div className="mt-8 max-w-3xl">
          <DemoNotice>{DEMO_NOTICE}</DemoNotice>
        </div>

        <dl className="mt-12 grid max-w-3xl grid-cols-1 gap-8 border-t border-dashed border-zinc-800 pt-8 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">KYA identifier</dt>
            <dd className="mt-2 break-all font-mono text-sm text-zinc-200">{agent.identityId}</dd>
            <CopyIdentityUrl path={`/agents/${agent.id}`} />
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Sample status</dt>
            <dd className="mt-2 text-sm text-zinc-200">{statusLabel(agent.status)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Claimed domain</dt>
            <dd className="mt-2 break-all text-sm text-zinc-200">{agent.claimedDomain}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Claimed endpoint</dt>
            <dd className="mt-2 break-all text-sm text-zinc-200">{agent.endpoint}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-zinc-500">Declared capabilities</dt>
            <dd className="mt-2 text-sm text-zinc-200">{agent.capabilities.join(", ")}</dd>
          </div>
        </dl>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">Domain control</h2>
        {agent.domainCheck ? (
          <div className="mt-6 max-w-2xl text-sm/5.5 font-light text-zinc-400">
            <p className="text-zinc-200">Simulated result. This check did not run.</p>
            <dl className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-x-3">
                <dt className="text-zinc-500">Method</dt>
                <dd>{agent.domainCheck.method}</dd>
              </div>
              <div className="flex flex-wrap gap-x-3">
                <dt className="text-zinc-500">Recorded result</dt>
                <dd>Passed (simulated)</dd>
              </div>
              <div className="flex flex-wrap gap-x-3">
                <dt className="text-zinc-500">Sample date</dt>
                <dd>{agent.domainCheck.recordedAt}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="mt-6 max-w-2xl text-sm/5.5 font-light text-zinc-400">
            No domain-control check is recorded on this sample. The identity is registered only.
          </p>
        )}

        <h2 className="mt-14 text-2xl font-medium text-white">What these states mean</h2>
        <ul className="mt-6 max-w-2xl space-y-4 text-sm/5.5 font-light text-zinc-400">
          <li>Registered means an identity record exists.</li>
          <li>Domain verified means a defined control challenge succeeded. On this page, that result is simulated.</li>
          <li>Neither state means the agent is safe, trustworthy, legally identified, or currently operating as described.</li>
        </ul>
      </SectionFrame>
    </main>
  );
}
