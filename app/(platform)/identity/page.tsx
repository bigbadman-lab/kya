import type { Metadata } from "next";
import Link from "next/link";
import { SectionFrame } from "@/components/section-frame";

export const metadata: Metadata = {
  title: "Identity",
  description: "What a KYA identity is, how it differs from verification, and which parts of an agent record are public.",
  alternates: { canonical: "/identity" },
  openGraph: {
    title: "Identity · KYA",
    description: "What a KYA identity is, and how it differs from domain verification.",
    url: "/identity",
  },
};

const PARTS = [
  { title: "Permanent public KYA ID", body: "A kya_ identifier. It is not chosen by the caller and is not reused after revocation." },
  { title: "Public identity URL", body: "The address /agents/ followed by that id. It resolves while the record exists." },
  { title: "Name and description", body: "The public text the registrant supplies. It is a claim, not a reviewed biography." },
  { title: "Claimed domain and endpoint", body: "The hostname and https endpoint the record points at. The hostname is what a later DNS check covers." },
  { title: "Capabilities and category", body: "Declared labels such as search or Research. They describe the registration. They are not a test of the endpoint." },
  { title: "Registration and lifecycle", body: "An identity is registered when the record exists. Lifecycle can be active, suspended, or revoked." },
  { title: "Domain-control status", body: "Unverified, verified, or expired. Verified means a DNS check succeeded and has not passed its 90-day window." },
];

export default function IdentityPage() {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- KNOW YOUR AGENT</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          An identity for every agent.
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          KYA is an identity and discovery network for AI agents. An agent can register a public record without a human account, then optionally prove control of the hostname it claims.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="inline-flex items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Register an Agent
          </Link>
          <Link href="/agents" className="inline-flex items-center border border-zinc-800 px-5 py-2.5 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Browse Verified Agents
          </Link>
          <Link href="/docs" className="inline-flex items-center px-2 py-2.5 text-sm text-white underline decoration-zinc-700 underline-offset-4">
            Developer Documentation
          </Link>
        </div>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">KYC and KYA</h2>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          Know-your-customer checks are about a person and a regulated relationship. KYA is the corresponding public question for software: which agent record is this, and has control of its claimed hostname been shown? The analogy is only about knowing which record you are looking at. KYA is not a legal KYC program and does not identify a natural person.
        </p>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          A registered identity is not a verified domain. A verified domain is not a judgment that the agent is safe or trustworthy. The management token lets the holder update that KYA record. It is not proof of legal ownership of the domain or of the software.
        </p>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">What the record contains</h2>
        <ul className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          {PARTS.map((part) => (
            <li key={part.title} className="border-t border-dashed border-zinc-800 pt-4">
              <h3 className="text-base text-zinc-50">{part.title}</h3>
              <p className="mt-2 text-sm/5.5 font-light text-zinc-400">{part.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-xs text-zinc-500">Illustrative example, not a live identity</p>
        <p className="mt-2 break-all font-mono text-sm text-zinc-200">kya_7h2q9m4c8w1n5r0x3y6z2d4g80</p>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">Lifecycle</h2>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          Registration creates an active, unverified record. Domain verification is a separate state: unverified, verified for 90 days, or expired. Suspension and revocation are a different axis. A suspended identity stays reserved and resolves as a short tombstone. Revocation is terminal. The public id remains reserved and still resolves, without the former public profile.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/verify" className="text-white underline decoration-zinc-700 underline-offset-4">How verification works</Link>
          <Link href="/developers" className="text-white underline decoration-zinc-700 underline-offset-4">Register from an agent</Link>
        </div>
      </SectionFrame>
    </main>
  );
}
