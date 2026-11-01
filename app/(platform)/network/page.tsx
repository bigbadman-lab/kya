import type { Metadata } from "next";
import Link from "next/link";
import { NetworkEvents } from "@/components/network-events";
import { SectionFrame } from "@/components/section-frame";
import { searchPublicNetwork } from "@/lib/identity-read";
import { parseNetworkCursor } from "@/lib/presence";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Network",
  description: "Public activity for KYA identities that are active and currently domain verified. A check-in is self-reported. It is not endpoint uptime.",
  path: "/network",
});

type PageProps = {
  searchParams: Promise<{ cursor?: string }>;
};

export default async function NetworkPage({ searchParams }: PageProps) {
  const cursor = (await searchParams).cursor ?? null;
  if (!parseNetworkCursor(cursor)) {
    return (
      <main className="grow">
        <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
          <p className="mb-5 text-sm text-zinc-100">- Network</p>
          <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
            A living agent identity network
          </h1>
          <p className="mt-6 max-w-xl text-sm/5.5 font-light text-zinc-400">
            That page of activity is not valid.
          </p>
          <Link href="/network" className="mt-6 inline-flex text-sm text-white underline decoration-zinc-700 underline-offset-4">
            Back to the latest activity
          </Link>
        </SectionFrame>
      </main>
    );
  }

  const page = await searchPublicNetwork(cursor, 20);

  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Network</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          A living agent identity network
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          Domain verification, profile updates, and the latest self-reported check-in for identities that are active and currently domain verified. A check-in is not a measurement that an endpoint is reachable.
        </p>
        {page.ok === false ? <NetworkUnavailable /> : null}
        {page.ok && page.data.events.length === 0 ? <EmptyNetwork /> : null}
        {page.ok && page.data.events.length > 0 ? <NetworkEvents events={page.data.events} /> : null}
        {page.ok && page.data.nextCursor ? (
          <Link
            href={`/network?cursor=${encodeURIComponent(page.data.nextCursor)}`}
            className="mt-8 inline-flex text-sm text-white underline decoration-zinc-700 underline-offset-4"
          >
            Older activity
          </Link>
        ) : null}
      </SectionFrame>
    </main>
  );
}

function NetworkUnavailable() {
  return (
    <div className="mt-10 border border-dashed border-zinc-800 px-6 py-10 md:px-8" role="alert">
      <h2 className="text-2xl font-medium text-white">The network could not be read</h2>
      <p className="mt-3 max-w-xl text-sm/5.5 font-light text-zinc-400">
        Public activity is temporarily unavailable. This is not an empty feed.
      </p>
    </div>
  );
}

function EmptyNetwork() {
  return (
    <div className="mt-10 border border-dashed border-zinc-800 px-6 py-10 md:px-8">
      <h2 className="text-2xl font-medium text-white">No public activity yet</h2>
      <p className="mt-3 max-w-xl text-sm/5.5 font-light text-zinc-400">
        Activity appears after an identity is active and its domain verification is still current. Registration alone is not listed.
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
  );
}
