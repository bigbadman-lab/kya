import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyIdentityUrl } from "@/components/copy-identity-url";
import { RegistryUnavailable } from "@/components/registry-state";
import { SectionFrame } from "@/components/section-frame";
import {
  domainVerificationLabel,
  formatVerificationExpiry,
  isPublicAgentIdentity,
  type PublicIdentity,
} from "@/lib/identity";
import { lookupPublicAgent } from "@/lib/identity-read";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await lookupPublicAgent(id);
  if (!result.ok) {
    return {
      title: "Registry unavailable",
      description: "This identity could not be read.",
    };
  }
  if (!result.data) return { title: "Identity not found" };
  if (!isPublicAgentIdentity(result.data)) {
    return {
      title: result.data.publicId,
      description: `This KYA identity is ${result.data.lifecycle}. Public details are not listed.`,
    };
  }
  return {
    title: result.data.name,
    description: `${result.data.name} is a public KYA identity. Domain verification is not a safety assessment.`,
  };
}

export default async function AgentProfilePage({ params }: PageProps) {
  const { id } = await params;
  const result = await lookupPublicAgent(id);
  if (!result.ok) {
    return (
      <main className="grow">
        <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
          <p className="mb-5 text-sm text-zinc-100">- Identity</p>
          <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
            Identity unavailable
          </h1>
          <RegistryUnavailable />
        </SectionFrame>
      </main>
    );
  }
  if (!result.data) notFound();
  if (!isPublicAgentIdentity(result.data)) return <Tombstone identity={result.data} />;
  return <ActiveIdentity identity={result.data} />;
}

function Tombstone({ identity }: { identity: PublicIdentity }) {
  if (isPublicAgentIdentity(identity)) return null;
  const label = identity.lifecycle === "suspended" ? "Suspended" : "Revoked";

  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Identity</p>
        <h1 className="max-w-3xl break-all text-4xl font-medium leading-tight text-white md:text-[40px]">
          {identity.publicId}
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          This identity is {label.toLowerCase()}. A record exists. Its name, endpoint, capabilities, and verification details are not public.
        </p>
        <dl className="mt-12 grid max-w-3xl grid-cols-1 gap-8 border-t border-dashed border-zinc-800 pt-8 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">KYA identifier</dt>
            <dd className="mt-2 break-all font-mono text-sm text-zinc-200">{identity.publicId}</dd>
            <CopyIdentityUrl path={identity.identityUrl} />
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Lifecycle</dt>
            <dd className="mt-2 text-sm text-zinc-200">{label}</dd>
          </div>
        </dl>
      </SectionFrame>
    </main>
  );
}

function ActiveIdentity({ identity }: { identity: Extract<PublicIdentity, { lifecycle: "active" }> }) {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Identity</p>
        <h1 className="max-w-3xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          {identity.name}
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">{identity.description}</p>
        <p className="mt-4 text-xs text-zinc-500">{identity.category}</p>

        <dl className="mt-12 grid max-w-3xl grid-cols-1 gap-8 border-t border-dashed border-zinc-800 pt-8 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">KYA identifier</dt>
            <dd className="mt-2 break-all font-mono text-sm text-zinc-200">{identity.publicId}</dd>
            <CopyIdentityUrl path={identity.identityUrl} />
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Lifecycle</dt>
            <dd className="mt-2 text-sm text-zinc-200">Active</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Claimed domain</dt>
            <dd className="mt-2 break-all text-sm text-zinc-200">{identity.claimedHost}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Claimed endpoint</dt>
            <dd className="mt-2 break-all text-sm text-zinc-200">{identity.endpointUrl}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-zinc-500">Declared capabilities</dt>
            <dd className="mt-2 text-sm text-zinc-200">{identity.capabilities.join(", ")}</dd>
          </div>
        </dl>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">Domain control</h2>
        <div className="mt-6 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          <p className="text-zinc-200">{domainVerificationLabel(identity.domainVerification)}</p>
          {identity.domainVerification === "verified" && identity.verificationExpiresAt ? (
            <p className="mt-3">Current until {formatVerificationExpiry(identity.verificationExpiresAt)}.</p>
          ) : null}
          {identity.domainVerification === "unverified" ? (
            <p className="mt-3">This identity is registered. It does not have current domain verification.</p>
          ) : null}
          {identity.domainVerification === "expired" ? (
            <p className="mt-3">An earlier domain verification is no longer current.</p>
          ) : null}
        </div>

        <h2 className="mt-14 text-2xl font-medium text-white">What these states mean</h2>
        <ul className="mt-6 max-w-2xl space-y-4 text-sm/5.5 font-light text-zinc-400">
          <li>Registered means an identity record exists.</li>
          <li>Domain verified means a defined control challenge succeeded and has not expired.</li>
          <li>Neither state means the agent is safe, trustworthy, legally identified, or currently operating as described.</li>
        </ul>
      </SectionFrame>
    </main>
  );
}
