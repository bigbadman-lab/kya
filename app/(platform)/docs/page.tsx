import type { Metadata } from "next";
import { DemoNotice } from "@/components/demo-notice";
import { SectionFrame } from "@/components/section-frame";

export const metadata: Metadata = {
  title: "Developers",
  description: "How public KYA lookup and discovery work, and which interfaces are not yet operational.",
};

const activeRecord = {
  publicId: "kya_…",
  identityUrl: "/agents/kya_…",
  name: "string",
  description: "string",
  category: "Research | Commerce | Operations | Developer tools",
  capabilities: ["search", "summarize", "scheduling", "checkout", "code-review", "monitoring"],
  endpointUrl: "https://…",
  claimedHost: "hostname",
  lifecycle: "active",
  domainVerification: "verified | unverified | expired",
  verificationExpiresAt: "timestamptz or null",
  registered: true,
};

const tombstone = {
  publicId: "kya_…",
  identityUrl: "/agents/kya_…",
  lifecycle: "suspended | revoked",
  registered: true,
};

const searchResult = {
  agents: ["active identity records"],
  nextCursor: "timestamptz or null",
};

export default function DocsPage() {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Developers</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Developer introduction
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          KYA — Know Your Agent. A public identity and discovery layer for AI agents. The website registry and identity pages read live public records. REST and MCP are not operational.
        </p>
        <div className="mt-8 max-w-3xl">
          <DemoNotice>
            Registration, domain-control checks, REST, and MCP are not available to call. The shapes below describe the public database responses. They are not a live identity.
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
              <li>Domain verified means a defined challenge showed control of the claimed domain and that result has not expired.</li>
              <li>An agent can be registered without being domain verified. A direct identity address still resolves it.</li>
              <li>Neither status proves the agent is safe, trustworthy, legally identified, or currently operating as described.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Public lookup</h2>
            <p className="mt-4">
              Open <span className="text-zinc-200">/agents/</span> followed by the public id. The page calls <span className="font-mono text-zinc-200">lookup_public_agent(p_public_id)</span>. Verification is evaluated in the database at read time. An unknown id is not found. A suspended or revoked identity returns only the tombstone. The response does not include an owner id, credential, challenge, or private event.
            </p>
            <h3 className="mt-6 text-base text-zinc-100">Active identity</h3>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {JSON.stringify(activeRecord, null, 2)}
            </pre>
            <h3 className="mt-6 text-base text-zinc-100">Suspended or revoked tombstone</h3>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {JSON.stringify(tombstone, null, 2)}
            </pre>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Public discovery</h2>
            <p className="mt-4">
              <span className="text-zinc-200">/agents</span> calls <span className="font-mono text-zinc-200">search_public_agents(p_query, p_category, p_cursor, p_limit)</span>. Results are active identities whose domain verification is still current, newest first. Unverified, expired, suspended, and revoked identities are omitted. There is no unverified filter. Categories are Research, Commerce, Operations, and Developer tools. Each page holds at most 20 records. <span className="font-mono text-zinc-200">nextCursor</span> is the oldest timestamp on a full page, or null.
            </p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {JSON.stringify(searchResult, null, 2)}
            </pre>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">REST and MCP</h2>
            <p className="mt-2 text-xs text-zinc-500">Not operational</p>
            <p className="mt-4">
              No public REST route and no MCP server are available. Do not call a registration, challenge, or management endpoint. The registration form and dashboard on this website are not connected to those operations.
            </p>
          </section>
        </article>
      </SectionFrame>
    </main>
  );
}
