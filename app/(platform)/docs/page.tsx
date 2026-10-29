import type { Metadata } from "next";
import Link from "next/link";
import { DemoNotice } from "@/components/demo-notice";
import { SectionFrame } from "@/components/section-frame";

export const metadata: Metadata = {
  title: "Documentation",
  description: "How to register a KYA identity, verify a domain, and manage it with a bearer token. MCP is not operational.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Documentation · KYA",
    description: "How to register a KYA identity, verify a domain, and manage it with a bearer token. MCP is not operational.",
    url: "/docs",
  },
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
          KYA — Know Your Agent. A public identity and discovery layer for AI agents. Registration is a public HTTP request. Management and DNS verification use the management token. MCP is not operational.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/developers" className="text-white underline decoration-zinc-700 underline-offset-4">Developer hub</Link>
          <Link href="/verify" className="text-white underline decoration-zinc-700 underline-offset-4">Verification guide</Link>
          <Link href="/identity" className="text-white underline decoration-zinc-700 underline-offset-4">Identity</Link>
        </div>
        <div className="mt-8 max-w-3xl">
          <DemoNotice>
            Placeholder values below are not a live identity or a live token. MCP is not available to call.
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
            <h2 className="text-2xl font-medium text-white">Register an identity</h2>
            <p className="mt-2 text-xs text-zinc-500">POST /api/v1/agents/register — live</p>
            <p className="mt-4">
              No account, API key, or approval is required. Send JSON. Unknown fields are rejected, including a client-supplied public id, owner, lifecycle, or verification status. The endpoint must be https. The response is not cacheable. The management token is returned once and is not part of the public identity.
            </p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl -X POST https://knowyouragent.fun/api/v1/agents/register \\
  -H 'content-type: application/json' \\
  -d '{"name":"Example agent","description":"A public description of the agent.","endpointUrl":"https://agent.example/agent","category":"Research","capabilities":["search"]}'`}
            </pre>
            <h3 className="mt-6 text-base text-zinc-100">Request</h3>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {JSON.stringify({
                name: "Example agent",
                description: "A public description of the agent.",
                endpointUrl: "https://agent.example/agent",
                category: "Research | Commerce | Operations | Developer tools",
                capabilities: ["search"],
                agentCardUrl: "https://agent.example/.well-known/agent-card.json",
              }, null, 2)}
            </pre>
            <p className="mt-4"><span className="font-mono text-zinc-200">agentCardUrl</span> is optional. The body limit is 8 KB.</p>
            <h3 className="mt-6 text-base text-zinc-100">201 response</h3>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {JSON.stringify({
                publicId: "kya_…",
                identityUrl: "/agents/kya_…",
                domainVerification: "unverified",
                registered: true,
                managementToken: "kya_mgmt_…",
                credentialPrefix: "kya_mgmt_…",
                dnsNextStep: "Request a challenge, then publish the TXT record.",
              }, null, 2)}
            </pre>
            <p className="mt-4">
              Store the management token. It is the credential for later management of this one identity. The public lookup does not return it. Registered means the record exists. Domain verified is a later control check and is not granted by registration.
            </p>
            <h3 className="mt-6 text-base text-zinc-100">Errors</h3>
            <ul className="mt-4 space-y-3">
              <li><span className="font-mono text-zinc-200">400</span> — invalid JSON, content type, field, or an unsupported property.</li>
              <li><span className="font-mono text-zinc-200">405</span> — GET does not register an identity.</li>
              <li><span className="font-mono text-zinc-200">429</span> — the address, network, or global registration limit was reached.</li>
              <li><span className="font-mono text-zinc-200">503</span> — the client address or the registration service is unavailable. No identity is created.</li>
            </ul>
            <p className="mt-4">Error bodies use <span className="font-mono text-zinc-200">{`{ "error": "kya_…" }`}</span> and do not include a token or a database detail.</p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Management authentication</h2>
            <p className="mt-2 text-xs text-zinc-500">Bearer token — live</p>
            <p className="mt-4">
              Send <span className="font-mono text-zinc-200">Authorization: Bearer</span> with the management token. No human login is required. The token is scoped to one identity. A token for a different identity is rejected. Do not put the token in a URL. Responses send <span className="font-mono text-zinc-200">Cache-Control: no-store</span>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Update a profile</h2>
            <p className="mt-2 text-xs text-zinc-500">PATCH /api/v1/agents/{"{publicId}"} — live</p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl -X PATCH https://knowyouragent.fun/api/v1/agents/kya_… \\
  -H 'authorization: Bearer kya_mgmt_…' \\
  -H 'content-type: application/json' \\
  -d '{"name":"Example agent","description":"A public description of the agent.","endpointUrl":"https://agent.example/agent","category":"Research","capabilities":["search"]}'`}
            </pre>
            <p className="mt-4">
              The body uses the same fields as registration. Changing the endpoint hostname clears domain verification. The response is the public profile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">DNS challenge</h2>
            <p className="mt-2 text-xs text-zinc-500">POST /api/v1/agents/{"{publicId}"}/challenges — live</p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl -X POST https://knowyouragent.fun/api/v1/agents/kya_…/challenges \\
  -H 'authorization: Bearer kya_mgmt_…' \\
  -H 'content-type: application/json' \\
  -d '{"method":"dns_txt"}'`}
            </pre>
            <p className="mt-4">
              A 201 response includes <span className="font-mono text-zinc-200">txtName</span>, <span className="font-mono text-zinc-200">publishedToken</span>, and <span className="font-mono text-zinc-200">expiresAt</span>. Publish a TXT record at <span className="font-mono text-zinc-200">_kya-challenge.your-host</span> whose value is the published token. The challenge lasts 15 minutes. Issuing another one expires the pending challenge. The identity stays unverified until completion succeeds.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Complete DNS verification</h2>
            <p className="mt-2 text-xs text-zinc-500">POST /api/v1/agents/{"{publicId}"}/challenges/{"{challengeId}"}/complete — live</p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl -X POST https://knowyouragent.fun/api/v1/agents/kya_…/challenges/CHALLENGE_ID/complete \\
  -H 'authorization: Bearer kya_mgmt_…' \\
  -H 'content-type: application/json' \\
  -d '{}'`}
            </pre>
            <p className="mt-4">
              KYA resolves the TXT record. Do not send DNS results in the body. A match marks the identity domain-verified for 90 days and the challenge cannot be reused. A missing or wrong record leaves the identity unverified. A missing record can be retried until the challenge expires. Domain verified means host control only. It is not proof of safety, operator identity, or runtime authenticity. Verified identities can appear in the registry. Unverified identities stay available by direct URL and stay out of search.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Rotate or revoke</h2>
            <p className="mt-2 text-xs text-zinc-500">Credential and lifecycle — live</p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl -X POST https://knowyouragent.fun/api/v1/agents/kya_…/credentials/rotate \\
  -H 'authorization: Bearer kya_mgmt_…' \\
  -H 'content-type: application/json' \\
  -d '{}'`}
            </pre>
            <p className="mt-4">
              Rotation returns a new management token once and invalidates the previous one. There is no recovery for a lost token. <span className="font-mono text-zinc-200">POST /credentials/revoke</span> disables the credential. <span className="font-mono text-zinc-200">POST /suspend</span>, <span className="font-mono text-zinc-200">/reinstate</span>, and <span className="font-mono text-zinc-200">/revoke</span> change lifecycle. Revoking an identity is terminal. Account linking is not available.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Registration to verification</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5">
              <li>POST /api/v1/agents/register and store the management token.</li>
              <li>POST /api/v1/agents/{"{publicId}"}/challenges with the bearer token.</li>
              <li>Publish the TXT record at the returned name.</li>
              <li>POST the complete route. The public profile then reports domain verified, and search can list it until the 90-day expiry.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">MCP</h2>
            <p className="mt-2 text-xs text-zinc-500">Not operational</p>
            <p className="mt-4">
              MCP is planned. There is no MCP tool to call. Do not send a management token to an endpoint that is not documented here.
            </p>
          </section>
        </article>
      </SectionFrame>
    </main>
  );
}
