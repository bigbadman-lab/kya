import type { Metadata } from "next";
import Link from "next/link";
import { AgentPromptCta } from "@/components/agent-prompt-cta";
import { SectionFrame } from "@/components/section-frame";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Developers",
  description: "Register a KYA identity over HTTP or MCP, without an account, then manage and verify it with the management token.",
  path: "/developers",
});

const USES = [
  { title: "Programmatic registration", body: "POST /api/v1/agents/register is live. No login, API key, or approval." },
  { title: "Public identity lookup", body: "The public page is /agents/{publicId}. GET /api/v1/agents/{publicId} without a credential returns the same public profile. It does not return a management token." },
  { title: "Management", body: "Later calls send Authorization: Bearer and the management token. The token is scoped to one identity." },
  { title: "DNS challenge", body: "Issue a TXT challenge, publish it, then complete it. KYA reads DNS. The caller does not submit the lookup result." },
  { title: "Registry discovery", body: "GET /api/v1/agents lists active identities whose domain verification is still current. Unverified identities stay available by public id." },
  { title: "Agent inspection", body: "POST /api/v1/agents/{publicId}/inspect with the bearer token asks for an AI reading of the stored profile. It is optional. It does not change domain verification or lifecycle." },
];

export default function DevelopersPage() {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- BUILD WITH KYA</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Identity infrastructure for agents.
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          KYA is API-first. Any HTTP client can register an identity. No human login and no pre-issued API key are required. The management token returned once authenticates later updates and verification for that identity.
        </p>
        <AgentPromptCta showPrompt className="mt-8" />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="inline-flex items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Register Agent
          </Link>
          <Link href="/docs" className="inline-flex items-center border border-zinc-800 px-5 py-2.5 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            API Documentation
          </Link>
          <Link href="/verify" className="inline-flex items-center px-2 py-2.5 text-sm text-white underline decoration-zinc-700 underline-offset-4">
            Verification Guide
          </Link>
        </div>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">Registration</h2>
        <p className="mt-2 text-xs text-zinc-500">POST /api/v1/agents/register — live</p>
        <pre className="mt-4 max-w-3xl overflow-x-auto border border-dashed border-zinc-800 p-4 font-mono text-xs leading-5 text-zinc-300">
          {`curl -X POST https://knowyouragent.fun/api/v1/agents/register \\
  -H 'content-type: application/json' \\
  -d '{"name":"Example agent","description":"A public description of the agent.","endpointUrl":"https://agent.example/agent","category":"Research","capabilities":["search"]}'`}
        </pre>
        <ul className="mt-6 max-w-2xl space-y-3 text-sm/5.5 font-light text-zinc-400">
          <li><span className="text-zinc-200">name</span> is 2 to 80 characters. <span className="text-zinc-200">description</span> is 10 to 500.</li>
          <li><span className="text-zinc-200">endpointUrl</span> must be https, with a public hostname and port 443 or none.</li>
          <li><span className="text-zinc-200">category</span> is one of Research, Commerce, Operations, or Developer tools.</li>
          <li><span className="text-zinc-200">capabilities</span> is 1 to 12 of search, summarize, scheduling, checkout, code-review, and monitoring, without duplicates.</li>
          <li><span className="text-zinc-200">agentCardUrl</span> is optional. Unknown fields, including a public id or verification status, are rejected.</li>
        </ul>
        <p className="mt-6 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          A 201 response includes the public profile, <span className="font-mono text-zinc-200">identityUrl</span>, <span className="font-mono text-zinc-200">domainVerification</span> set to unverified, <span className="font-mono text-zinc-200">credentialPrefix</span>, and <span className="font-mono text-zinc-200">managementToken</span>. The token is shown once and the response is not cacheable. Store it, then send it as <span className="font-mono text-zinc-200">Authorization: Bearer</span>. Do not put it in a URL. The dashboard asks for it again and does not read it from the address bar.
        </p>
        <h3 className="mt-10 text-base text-zinc-100">DNS, after registration</h3>
        <ol className="mt-4 max-w-2xl list-decimal space-y-3 pl-5 text-sm/5.5 font-light text-zinc-400">
          <li>POST /api/v1/agents/{"{publicId}"}/challenges with the bearer token and {`{"method":"dns_txt"}`}.</li>
          <li>Publish the returned token as a TXT record at the returned name. The challenge lasts 15 minutes.</li>
          <li>POST the complete route with an empty JSON object. KYA queries DNS. A match is current for 90 days.</li>
        </ol>
        <p className="mt-4 text-sm text-zinc-400">
          Field-level errors, rotation, and revocation are in the <Link href="/docs" className="text-white underline decoration-zinc-700 underline-offset-4">API reference</Link>.
        </p>
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="text-2xl font-medium text-white">What you can call</h2>
        <ul className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          {USES.map((item) => (
            <li key={item.title} className="border-t border-dashed border-zinc-800 pt-4">
              <h3 className="text-base text-zinc-50">{item.title}</h3>
              <p className="mt-2 text-sm/5.5 font-light text-zinc-400">{item.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12 max-w-2xl border border-dashed border-zinc-800 px-5 py-6">
          <h2 className="text-2xl font-medium text-white">Agent Inspector</h2>
          <p className="mt-3 text-sm/5.5 font-light text-zinc-400">
            Inspection is optional. The operator sends an empty JSON body with the management token. KYA sends the stored name, description, category, capabilities, hostname, endpoint, and agent card URL to the model. The result is an interpretation of that self-reported text. It does not prove domain control, safety, legal identity, or how the endpoint behaves. A change to any of those fields makes the previous interpretation stale. Opening a public profile does not run a new inspection.
          </p>
        </div>
        <div className="mt-8 max-w-2xl border border-dashed border-zinc-800 px-5 py-6">
          <h2 className="text-2xl font-medium text-white">Remote MCP</h2>
          <p className="mt-3 text-sm/5.5 font-light text-zinc-400">
            This application serves Streamable HTTP at <span className="font-mono text-zinc-200">/mcp</span>. Locally that is <span className="font-mono text-zinc-200">http://localhost:3000/mcp</span>. Production becomes <span className="font-mono text-zinc-200">https://knowyouragent.fun/mcp</span> when this version is deployed. Public tools need no API key. Management tools need the management token for that identity, in the <span className="font-mono text-zinc-200">managementToken</span> field or in <span className="font-mono text-zinc-200">Authorization: Bearer</span>. Do not put the token in a URL. The tools and the HTTP routes call the same identity operations. Inspector generation is not an MCP tool.
          </p>
        </div>
        <p className="mt-8 text-sm text-zinc-400">
          Management for a human operator is on the <Link href="/dashboard" className="text-white underline decoration-zinc-700 underline-offset-4">dashboard</Link>. Enter the token there. It is not saved in the browser.
        </p>
      </SectionFrame>
    </main>
  );
}
