import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentInspector } from "@/components/agent-inspector";
import { CopyIdentityUrl } from "@/components/copy-identity-url";
import { IdentityCard } from "@/components/identity-card";
import { IdentityCardActions } from "@/components/identity-card-actions";
import { RegistryUnavailable } from "@/components/registry-state";
import { SectionFrame } from "@/components/section-frame";
import {
  domainVerificationLabel,
  formatVerificationExpiry,
  isPublicAgentIdentity,
  type PublicIdentity,
} from "@/lib/identity";
import { lookupInspectorReport, lookupPublicAgent } from "@/lib/identity-read";
import type { PublicInspection } from "@/lib/inspector";
import { cardFromIdentity, cardPngPath, type IdentityCardModel } from "@/lib/identity-card";

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
      robots: { index: false, follow: false },
    };
  }
  if (!result.data) return { title: "Identity not found", robots: { index: false, follow: false } };
  if (!isPublicAgentIdentity(result.data)) {
    return cardMetadata(cardFromIdentity(result.data), `This KYA identity is ${result.data.lifecycle}. Public details are not listed.`, false);
  }
  const card = cardFromIdentity(result.data);
  const description = card.tone === "verified"
    ? `${result.data.name} has current domain verification on KYA. Verification is a DNS control check, not a safety assessment.`
    : `${result.data.name} is registered on KYA. Domain verification is not current. A KYA record is not a safety assessment.`;
  return cardMetadata(card, description, true);
}

function cardMetadata(card: IdentityCardModel, description: string, index: boolean): Metadata {
  const path = card.profilePath ?? `/agents/${card.publicId}`;
  const title = card.name ?? card.publicId;
  const image = {
    url: cardPngPath(card.publicId),
    width: 1200,
    height: 630,
    alt: card.name ? `${card.name} KYA identity card` : `${card.publicId} KYA identity`,
  };
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index, follow: true },
    openGraph: {
      title: `${title} · KYA`,
      description,
      url: path,
      siteName: "KYA",
      type: "website",
      locale: "en_US",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      images: [image.url],
    },
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
  const inspection = await lookupInspectorReport(result.data.publicId);
  return <ActiveIdentity identity={result.data} inspection={inspection} />;
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
        <div className="mt-8">
          <IdentityCard card={cardFromIdentity(identity)} />
          <IdentityCardActions card={cardFromIdentity(identity)} />
        </div>
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
        <p className="mt-8 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          The holder of the management token can open this record from the dashboard. The link does not include the token, and this page does not store it.
        </p>
        <Link href="/dashboard" className="mt-4 inline-flex text-sm text-white underline decoration-zinc-700 underline-offset-4">
          Manage this identity
        </Link>
      </SectionFrame>
    </main>
  );
}

function ActiveIdentity({
  identity,
  inspection,
}: {
  identity: Extract<PublicIdentity, { lifecycle: "active" }>;
  inspection: PublicInspection;
}) {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Identity</p>
        <h1 className="max-w-3xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          {identity.name}
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">{identity.description}</p>
        <p className="mt-4 text-xs text-zinc-500">{identity.category}</p>
        <div className="mt-8">
          <IdentityCard card={cardFromIdentity(identity)} />
          <IdentityCardActions card={cardFromIdentity(identity)} />
        </div>

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
          <li>AI inspected means a model interpreted the self-reported profile. It is not a verification or a safety judgment.</li>
          <li>None of these states means the agent is safe, trustworthy, legally identified, or currently operating as described.</li>
        </ul>
        <div className="mt-14">
          <AgentInspector report={inspection} />
        </div>
        <p className="mt-8 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          The holder of the management token can update this record from the dashboard. The link does not include the token, and this page does not store it.
        </p>
        <Link href="/dashboard" className="mt-4 inline-flex text-sm text-white underline decoration-zinc-700 underline-offset-4">
          Manage this identity
        </Link>
      </SectionFrame>
    </main>
  );
}
