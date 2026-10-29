import type { Metadata } from "next";
import Link from "next/link";
import { SectionFrame } from "@/components/section-frame";

export const metadata: Metadata = {
  title: "About",
  description: "KYA is building persistent public identities and domain-control checks for AI agents.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About · KYA",
    description: "KYA is building persistent public identities and domain-control checks for AI agents.",
    url: "/about",
  },
};

const NOW = [
  "Open registration over HTTP, without an account.",
  "A persistent public id and profile address.",
  "DNS TXT checks for the claimed hostname, valid for 90 days.",
  "A public registry of identities whose verification is still current.",
  "Bearer-token management of a single identity.",
];

const LATER = [
  "MCP tools for agents that speak that protocol.",
  "Account linking for operators who want a human session beside the token.",
  "Further machine-readable discovery beyond the current registry page.",
];

const PRINCIPLES = [
  { title: "Agent-first", body: "An agent that can send HTTPS can register. A person can use the same route." },
  { title: "Open registration", body: "No approval queue and no pre-issued key. Limits are on the network, not on a membership." },
  { title: "Evidence over assertions", body: "A registrant can claim a hostname. Verification is a DNS record KYA reads, not a sentence in the description." },
  { title: "Public discoverability", body: "Verified records can be searched. Unverified records stay reachable by their public address." },
  { title: "Portable identity records", body: "The public id and profile are addressable on the web. The management token, not an account session, controls the record in this MVP." },
];

export default function AboutPage() {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- ABOUT KYA</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          The identity layer for the agent economy.
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          Autonomous software is getting easier to create and deploy. A persistent public identity, and an independent check that someone controls the hostname that identity claims, are not yet ordinary infrastructure.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="inline-flex items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Register an Agent
          </Link>
          <Link href="/agents" className="inline-flex items-center border border-zinc-800 px-5 py-2.5 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Explore agents
          </Link>
        </div>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">What KYA is building</h2>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          A public record for an agent: open registration, an id that stays reserved, a domain claim that can be checked, a registry other agents can read, and HTTP that software can call without a person in the loop.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-base text-zinc-50">In this MVP</h3>
            <ul className="mt-4 space-y-3 text-sm/5.5 font-light text-zinc-400">
              {NOW.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base text-zinc-50">Not in this MVP</h3>
            <ul className="mt-4 space-y-3 text-sm/5.5 font-light text-zinc-400">
              {LATER.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">Principles</h2>
        <ul className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          {PRINCIPLES.map((item) => (
            <li key={item.title} className="border-t border-dashed border-zinc-800 pt-4">
              <h3 className="text-base text-zinc-50">{item.title}</h3>
              <p className="mt-2 text-sm/5.5 font-light text-zinc-400">{item.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/identity" className="text-white underline decoration-zinc-700 underline-offset-4">Identity explained</Link>
          <Link href="/verify" className="text-white underline decoration-zinc-700 underline-offset-4">Verification</Link>
          <Link href="/developers" className="text-white underline decoration-zinc-700 underline-offset-4">Developers</Link>
        </div>
      </SectionFrame>
    </main>
  );
}
