import type { Metadata } from "next";
import { DemoNotice } from "@/components/demo-notice";
import { SectionFrame } from "@/components/section-frame";
import { DEMO_AGENTS } from "@/data/demo-agents";

export const metadata: Metadata = {
  title: "Developers",
  description: "What a KYA identity is, how registration differs from domain control, and which APIs are planned.",
};

export default function DocsPage() {
  const sample = DEMO_AGENTS[0];
  const record = {
    id: sample.identityId,
    name: sample.name,
    description: sample.description,
    claimedDomain: sample.claimedDomain,
    endpoint: sample.endpoint,
    category: sample.category,
    capabilities: sample.capabilities,
    registration: "registered",
    domainControl: "simulated_pass",
    safetyAssessment: null,
    illustrative: true,
  };

  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Developers</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Developer introduction
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          KYA — Know Your Agent. A public identity and discovery layer for AI agents. The interfaces below are the planned shape of the product. They are not deployed.
        </p>
        <div className="mt-8 max-w-3xl">
          <DemoNotice>
            Every route described on this page is planned, not live. Do not call them. This build has no API.
          </DemoNotice>
        </div>

        <article className="mt-14 max-w-3xl space-y-12 text-sm/5.5 font-light text-zinc-400">
          <section>
            <h2 className="text-2xl font-medium text-white">What is a KYA identity?</h2>
            <p className="mt-4">
              A KYA identity is a public record for one agent: a stable identifier, a name, a description, a claimed domain or endpoint, and the capabilities the registrant declares. It is an identity record, not a certificate of safety or a legal identification of the operator.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Registered vs domain verified</h2>
            <ul className="mt-4 space-y-3">
              <li>Registered means the identity record exists.</li>
              <li>Domain verified means a defined challenge showed control of the claimed domain or endpoint.</li>
              <li>An agent can be registered without being domain verified.</li>
              <li>Neither status proves the agent is safe, trustworthy, legally identified, or currently operating as described.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Planned registration and lookup</h2>
            <p className="mt-2 text-xs text-zinc-500">Planned — not live</p>
            <ol className="mt-4 list-decimal space-y-3 pl-5">
              <li>A person, or later an agent, submits the same fields as the registration form.</li>
              <li>KYA would return a persistent identity id. That response does not exist yet.</li>
              <li>The registrant may then run a domain or endpoint control challenge. The challenge is not implemented.</li>
              <li>Anyone could later look up the identity by id and read the public record. Lookup is not implemented.</li>
            </ol>
            <p className="mt-4">
              No host, path, or method on this page is an operational endpoint. The website routes for the sample registry, the registration form, and this document are interface prototypes only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Planned MCP integration</h2>
            <p className="mt-2 text-xs text-zinc-500">Planned — not live</p>
            <p className="mt-4">
              A later phase may expose MCP tools so an agent can register an identity, retrieve a record, and read a control-check result. No MCP server is running in this build, and no tool names here can be called.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Illustrative identity record</h2>
            <p className="mt-4">
              This JSON is shaped like a future public record and is filled with the Harbor sample. It is not a response from a service.
            </p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {JSON.stringify(record, null, 2)}
            </pre>
          </section>
        </article>
      </SectionFrame>
    </main>
  );
}
