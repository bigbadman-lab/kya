import type { Metadata } from "next";
import Link from "next/link";
import { SectionFrame } from "@/components/section-frame";

export const metadata: Metadata = {
  title: "Verification",
  description: "How a KYA identity proves control of its claimed hostname with a DNS TXT challenge, and what that check does not prove.",
  alternates: { canonical: "/verify" },
  openGraph: {
    title: "Verification · KYA",
    description: "How a KYA identity proves control of its claimed hostname with a DNS TXT challenge.",
    url: "/verify",
  },
};

const STEPS = [
  { number: "01", title: "Register an agent", body: "Create the identity on the registration page or with POST /api/v1/agents/register. The record starts unverified." },
  { number: "02", title: "Retain the management credential", body: "The response includes a management token once. Store it outside the browser. The dashboard does not keep it for you." },
  { number: "03", title: "Request a DNS TXT challenge", body: "Open the dashboard, enter the public id and token, and issue a challenge. The response names the TXT host and the value to publish." },
  { number: "04", title: "Publish the TXT record", body: "At _kya-challenge on the claimed hostname, publish a TXT record whose value is the challenge token and nothing else." },
  { number: "05", title: "Complete verification", body: "Ask KYA to read that record. KYA resolves DNS itself. A match marks the identity domain-verified." },
  { number: "06", title: "Appear in the verified registry", body: "Search lists active identities whose domain verification is still current. A direct profile URL works before that." },
];

const LINKS = [
  { href: "/register", label: "Register Agent" },
  { href: "/dashboard", label: "Manage Agent" },
  { href: "/agents", label: "Explore Agents" },
  { href: "/docs", label: "API Docs" },
];

export default function VerifyPage() {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- AGENT VERIFICATION</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Prove control. Establish identity.
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          Domain verification shows that someone who holds the management token can publish a DNS record for the claimed hostname. It is a control check, not a review of the agent.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-white underline decoration-zinc-700 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              {link.label}
            </Link>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">The check</h2>
        <ol className="mt-8 grid grid-cols-1 gap-px border border-dashed border-zinc-800 md:grid-cols-2">
          {STEPS.map((step) => (
            <li key={step.number} className="border border-dashed border-zinc-800 p-6">
              <p className="font-mono text-xs text-zinc-500">{step.number}</p>
              <h3 className="mt-3 text-base text-zinc-50">{step.title}</h3>
              <p className="mt-3 text-sm/5.5 font-light text-zinc-400">{step.body}</p>
            </li>
          ))}
        </ol>
        <Link href="/dashboard" className="mt-8 inline-flex items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Continue in the dashboard
        </Link>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">What the record means</h2>
        <ul className="mt-6 max-w-2xl space-y-4 text-sm/5.5 font-light text-zinc-400">
          <li>A DNS TXT challenge expires after 15 minutes.</li>
          <li>A successful verification stays current for 90 days.</li>
          <li>DNS propagation can delay the first successful read. A missing record can be checked again until the challenge expires.</li>
          <li>Requesting a new challenge replaces any previous pending challenge for that agent.</li>
          <li>Verification applies to the claimed hostname, not to every name the agent might use later.</li>
          <li>Changing the claimed hostname clears the current verification.</li>
          <li>The check proves domain control at the time KYA reads the record. It does not identify a legal operator, and it does not mean the agent is safe.</li>
        </ul>
        <p className="mt-8 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          This page does not run a second verification process. Issue and complete the challenge from the dashboard, or call the same routes documented for developers.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/identity" className="text-white underline decoration-zinc-700 underline-offset-4">What a KYA identity is</Link>
          <Link href="/developers" className="text-white underline decoration-zinc-700 underline-offset-4">Developer hub</Link>
        </div>
      </SectionFrame>
    </main>
  );
}
