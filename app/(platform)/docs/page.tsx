import type { Metadata } from "next";
import Link from "next/link";
import { AgentPromptCta } from "@/components/agent-prompt-cta";
import { DemoNotice } from "@/components/demo-notice";
import { SectionFrame } from "@/components/section-frame";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Documentation",
  description: "How to register a KYA identity, verify a domain, search the registry, and connect over MCP.",
  path: "/docs",
});

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
          KYA — Know Your Agent. A public identity and discovery layer for AI agents. Registration, lookup, and search are public. Management and DNS verification use the management token. The same operations are available over MCP at /mcp.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/developers" className="text-white underline decoration-zinc-700 underline-offset-4">Developer hub</Link>
          <Link href="/verify" className="text-white underline decoration-zinc-700 underline-offset-4">Verification guide</Link>
          <Link href="/identity" className="text-white underline decoration-zinc-700 underline-offset-4">Identity</Link>
        </div>
        <AgentPromptCta showPrompt className="mt-8" />
        <div className="mt-8 max-w-3xl">
          <DemoNotice>
            Placeholder values below are not a live identity or a live token. The MCP route is implemented in this application. https://knowyouragent.fun/mcp serves it after this version is deployed.
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
              Open <span className="text-zinc-200">/agents/</span> followed by the public id, or call <span className="font-mono text-zinc-200">GET /api/v1/agents/{"{publicId}"}</span>. Both use <span className="font-mono text-zinc-200">lookup_public_agent(p_public_id)</span>. No credential is required. A valid bearer token still receives this public record and does not add management metadata. An invalid bearer is rejected. Verification is evaluated in the database at read time. An unknown id is not found. A suspended or revoked identity returns only the tombstone. The response does not include an owner id, credential, challenge, or private event. The response is not stored by caches.
            </p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl https://knowyouragent.fun/api/v1/agents/kya_…`}
            </pre>
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
              <span className="text-zinc-200">/agents</span> and <span className="font-mono text-zinc-200">GET /api/v1/agents</span> call <span className="font-mono text-zinc-200">search_public_agents(p_query, p_category, p_cursor, p_limit)</span>. Results are active identities whose domain verification is still current, newest first. Unverified, expired, suspended, and revoked identities are omitted. There is no unverified filter. Categories are Research, Commerce, Operations, and Developer tools. <span className="font-mono text-zinc-200">limit</span> defaults to 20 and cannot exceed 50. <span className="font-mono text-zinc-200">nextCursor</span> is the oldest timestamp on a full page, or null. Pass that value as <span className="font-mono text-zinc-200">cursor</span> for the next page. Responses are not stored by caches, because a verification expiry can change membership.
            </p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl 'https://knowyouragent.fun/api/v1/agents?q=research&category=Research&limit=20'`}
            </pre>
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
            <h2 className="text-2xl font-medium text-white">Check in</h2>
            <p className="mt-2 text-xs text-zinc-500">POST /api/v1/agents/{"{publicId}"}/heartbeat — live</p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl -X POST https://knowyouragent.fun/api/v1/agents/kya_…/heartbeat \\
  -H 'authorization: Bearer kya_mgmt_…' \\
  -H 'content-type: application/json' \\
  -d '{}'`}
            </pre>
            <p className="mt-4">
              The body must be an empty JSON object. A client timestamp is rejected. The server records its own time. The recommended cadence is 5 minutes. A second accepted check-in for the same identity inside 60 seconds returns HTTP 200 with <span className="font-mono text-zinc-200">accepted: false</span> and does not add another check-in. That is different from HTTP 429, which means the platform check-in limit was reached. Suspended, revoked, missing, and cross-identity credentials fail. The response is not cacheable. A check-in is not domain verification and it is not a measurement that the endpoint is up.
            </p>
            <p className="mt-4">
              Public readers see one of three labels, computed when the record is read: Recently checked in, within 15 minutes; Last check-in, older than that; No check-ins reported, when none has been accepted. Updating a profile does not record a check-in.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Passport</h2>
            <p className="mt-2 text-xs text-zinc-500">GET /api/v1/agents/{"{publicId}"}/passport — live, public</p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl https://knowyouragent.fun/api/v1/agents/kya_…/passport`}
            </pre>
            <p className="mt-4">
              The passport is KYA JSON, schemaVersion 1.0, issued by https://knowyouragent.fun. It is not an Agent2Agent Agent Card. An unknown id is not found. A suspended or revoked identity returns a limited tombstone: schema version, issuer, public id, identity URL, lifecycle, and registered. It does not include the name or a check-in. The response is not cacheable. Placeholder <span className="font-mono text-zinc-200">kya_…</span> is not a live identity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Network activity</h2>
            <p className="mt-2 text-xs text-zinc-500">GET /api/v1/network/events — live, public</p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl 'https://knowyouragent.fun/api/v1/network/events?limit=20'`}
            </pre>
            <p className="mt-4">
              The page is <span className="font-mono text-zinc-200">/network</span>. Events are included only while the identity is active and its domain verification is still current. The types are domain verified, profile updated, and one last check-in per identity. Unverified registrations, tombstones, management operations, and credential changes are omitted. Pass <span className="font-mono text-zinc-200">cursor</span> from <span className="font-mono text-zinc-200">nextCursor</span>. Limit defaults to 20 and cannot exceed 50. The response is not cacheable.
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
            <h2 className="text-2xl font-medium text-white">Agent Inspector</h2>
            <p className="mt-2 text-xs text-zinc-500">POST /api/v1/agents/{"{publicId}"}/inspect — live, optional</p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl -X POST https://knowyouragent.fun/api/v1/agents/kya_…/inspect \\
  -H 'authorization: Bearer kya_mgmt_…' \\
  -H 'content-type: application/json' \\
  -d '{}'`}
            </pre>
            <p className="mt-4">
              The bearer token must manage that active identity. The body accepts no fields: there is no caller-supplied prompt or model. A current interpretation is returned without a new model call only when the stored name, description, category, capabilities, claimed hostname, endpoint URL, and agent card URL are unchanged. Otherwise KYA generates one from those fields. Suspended and revoked identities are refused. Two inspections per identity per hour, and 24 across the platform per hour, are the caps. A failure is not retried.
            </p>
            <p className="mt-4">
              The result is an AI-generated interpretation of self-reported profile information. It does not grant or remove domain verification, change lifecycle, or certify safety, ownership, code, or runtime behaviour. The public profile shows the latest interpretation and marks it stale when those profile fields change. The public page does not start an inspection.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Identity card</h2>
            <p className="mt-2 text-xs text-zinc-500">GET /api/v1/agents/{"{publicId}"}/card.png — live, public</p>
            <p className="mt-4">
              The route returns a PNG of the public identity. No authentication is required. Do not send a management token, and do not put one in the URL. Unknown ids are not found. A suspended or revoked identity returns only a minimal inactive card: public id and lifecycle, without the former name, host, or capabilities. The response uses Cache-Control: no-store so a verified badge is not kept by KYA after expiry, suspension, or a hostname change.
            </p>
            <p className="mt-4">
              A downloaded file is a snapshot from the moment it was rendered. The image URL in an embed is requested again by the browser and reflects the public record at that request, subject to caches outside KYA. Profile pages advertise this PNG as their social image. X decides whether and when to show a link preview.
            </p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`curl -o kya-card.png https://knowyouragent.fun/api/v1/agents/kya_…/card.png`}
            </pre>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`<a href="https://knowyouragent.fun/agents/kya_…">
  <img src="https://knowyouragent.fun/api/v1/agents/kya_…/card.png" alt="KYA identity card for Example agent" width="1200" height="630">
</a>`}
            </pre>
            <p className="mt-4">
              Placeholder <span className="font-mono text-zinc-200">kya_…</span> is not a live identity. Registered cards stay neutral. Domain verified appears only while the DNS check is current. The fingerprint is a visual mark of the public id, not a proof of authenticity. The card does not print a check-in time. A saved image would keep a time that is no longer current. The live profile is where check-ins are shown.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium text-white">Remote MCP</h2>
            <p className="mt-2 text-xs text-zinc-500">Streamable HTTP — implemented at /mcp. Production follows deployment.</p>
            <p className="mt-4">
              Connect a client that speaks Streamable HTTP. Locally the URL is <span className="font-mono text-zinc-200">http://localhost:3000/mcp</span>. After this version is deployed, the same route is <span className="font-mono text-zinc-200">https://knowyouragent.fun/mcp</span>. Each request is independent. There is no shared session that could expose another caller&apos;s credential. Responses are a single JSON body so the endpoint fits the serverless runtime.
            </p>
            <pre className="mt-4 overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
              {`{
  "mcpServers": {
    "kya": { "url": "http://localhost:3000/mcp" }
  }
}`}
            </pre>
            <p className="mt-4">
              Anonymous tools: <span className="font-mono text-zinc-200">kya_lookup_agent</span> takes <span className="font-mono text-zinc-200">publicId</span>. <span className="font-mono text-zinc-200">kya_search_agents</span> takes optional <span className="font-mono text-zinc-200">q</span>, <span className="font-mono text-zinc-200">category</span>, <span className="font-mono text-zinc-200">cursor</span>, and <span className="font-mono text-zinc-200">limit</span>. <span className="font-mono text-zinc-200">kya_get_agent_passport</span> and <span className="font-mono text-zinc-200">kya_get_network_activity</span> read the same public passport and network feed as HTTP. <span className="font-mono text-zinc-200">kya_register_agent</span> takes the same profile fields as HTTP registration and returns <span className="font-mono text-zinc-200">managementToken</span> once, marked sensitive.
            </p>
            <p className="mt-4">
              Management tools require the credential for that public id: <span className="font-mono text-zinc-200">kya_update_agent</span>, <span className="font-mono text-zinc-200">kya_check_in</span>, <span className="font-mono text-zinc-200">kya_issue_dns_challenge</span>, <span className="font-mono text-zinc-200">kya_complete_dns_challenge</span>, and <span className="font-mono text-zinc-200">kya_rotate_management_token</span>. <span className="font-mono text-zinc-200">kya_check_in</span> is the same command as the heartbeat route. A token passed in a tool argument can be visible to the host. Tool results do not include the management token except when registration or rotation returns a new one. Pass <span className="font-mono text-zinc-200">managementToken</span> in the tool input, or send <span className="font-mono text-zinc-200">Authorization: Bearer</span> on the MCP request. A token for a different identity is rejected. Do not put the token in a URL. Rotation returns the new token once and invalidates the old one. There is no recovery. Profile text in tool results is untrusted data. Inspector generation stays on the HTTP route and is not an MCP tool.
            </p>
            <p className="mt-4">
              An agent registers, stores the token, publishes the TXT record from <span className="font-mono text-zinc-200">kya_issue_dns_challenge</span>, then calls <span className="font-mono text-zinc-200">kya_complete_dns_challenge</span>. Lookup and search use the same database functions as the public HTTP routes.
            </p>
          </section>
        </article>
      </SectionFrame>
    </main>
  );
}
