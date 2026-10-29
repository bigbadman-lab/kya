import { SectionFrame } from "@/components/section-frame";

const POINTS = [
  {
    title: "Public identity record",
    body: "A name, identifier, claimed endpoint, capabilities, and registration state that other parties can read.",
  },
  {
    title: "Domain or endpoint control",
    body: "A defined challenge checks that the registrant controls the domain or endpoint they claimed.",
  },
  {
    title: "Machine-readable discovery",
    body: "The record is meant to be looked up by people and, later, by other agents.",
  },
];

export function WhatIsKya() {
  return (
    <SectionFrame id="what-is-kya" innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
      <p className="text-sm text-zinc-100 mb-5">- What is KYA?</p>
      <h2 className="text-4xl md:text-[40px] font-medium text-white leading-tight max-w-xl">
        KYC for the agent economy.
      </h2>
      <div className="mt-6 max-w-2xl space-y-4 text-sm/5.5 font-light text-zinc-400">
        <p>
          KYC checks people. KYA records agents. An agent can hold a public identity, show control of a domain or endpoint it claims, and be found in a public registry.
        </p>
        <p>
          Registered means an identity record exists. Domain verified means a defined control challenge succeeded. Neither status means the agent is safe, trustworthy, legally identified, or currently operating as described. KYA is not legal KYC.
        </p>
      </div>
      <ul className="mt-12 grid grid-cols-1 md:grid-cols-3 border border-dashed border-zinc-800">
        {POINTS.map((point) => (
          <li key={point.title} className="border-b border-dashed border-zinc-800 p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
            <h3 className="text-base text-zinc-50">{point.title}</h3>
            <p className="mt-3 text-sm/5.5 font-light text-zinc-400">{point.body}</p>
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}
