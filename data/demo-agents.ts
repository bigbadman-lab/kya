export const DEMO_CATEGORIES = [
  "Research",
  "Commerce",
  "Operations",
  "Developer tools",
] as const;

export const DEMO_CAPABILITIES = [
  "search",
  "summarize",
  "scheduling",
  "checkout",
  "code-review",
  "monitoring",
] as const;

export type DemoCategory = (typeof DEMO_CATEGORIES)[number];
export type DemoCapability = (typeof DEMO_CAPABILITIES)[number];
export type DemoStatus = "registered" | "domain_verified";

export interface DemoDomainCheck {
  simulated: true;
  method: string;
  result: "passed";
  recordedAt: string;
}

export interface DemoAgent {
  id: string;
  name: string;
  description: string;
  identityId: string;
  claimedDomain: string;
  endpoint: string;
  category: DemoCategory;
  capabilities: DemoCapability[];
  status: DemoStatus;
  domainCheck: DemoDomainCheck | null;
  illustrative: true;
}

export const DEMO_AGENTS: DemoAgent[] = [
  {
    id: "harbor",
    name: "Harbor",
    description:
      "A sample research agent used to show how a public identity record reads in the registry.",
    identityId: "kya:demo:harbor",
    claimedDomain: "harbor.example",
    endpoint: "https://harbor.example/agent",
    category: "Research",
    capabilities: ["search", "summarize"],
    status: "domain_verified",
    domainCheck: {
      simulated: true,
      method: "DNS TXT challenge",
      result: "passed",
      recordedAt: "2026-10-01",
    },
    illustrative: true,
  },
  {
    id: "ledger",
    name: "Ledger",
    description:
      "A sample commerce agent with an identity record and no domain-control check.",
    identityId: "kya:demo:ledger",
    claimedDomain: "ledger.example",
    endpoint: "https://ledger.example/agent",
    category: "Commerce",
    capabilities: ["checkout", "search"],
    status: "registered",
    domainCheck: null,
    illustrative: true,
  },
  {
    id: "northstar",
    name: "Northstar",
    description:
      "A sample operations agent included so the registry can show a simulated domain-control result.",
    identityId: "kya:demo:northstar",
    claimedDomain: "northstar.example",
    endpoint: "https://northstar.example/agent",
    category: "Operations",
    capabilities: ["scheduling", "monitoring"],
    status: "domain_verified",
    domainCheck: {
      simulated: true,
      method: "DNS TXT challenge",
      result: "passed",
      recordedAt: "2026-10-01",
    },
    illustrative: true,
  },
  {
    id: "kiln",
    name: "Kiln",
    description:
      "A sample developer-tools agent. The record exists. No control challenge is attached.",
    identityId: "kya:demo:kiln",
    claimedDomain: "kiln.example",
    endpoint: "https://kiln.example/agent",
    category: "Developer tools",
    capabilities: ["code-review"],
    status: "registered",
    domainCheck: null,
    illustrative: true,
  },
  {
    id: "atlas",
    name: "Atlas",
    description:
      "A second sample research agent, registered only, for search and filter states.",
    identityId: "kya:demo:atlas",
    claimedDomain: "atlas.example",
    endpoint: "https://atlas.example/agent",
    category: "Research",
    capabilities: ["summarize", "search"],
    status: "registered",
    domainCheck: null,
    illustrative: true,
  },
  {
    id: "parcel",
    name: "Parcel",
    description:
      "A sample commerce agent with a simulated endpoint-control note, not a live check.",
    identityId: "kya:demo:parcel",
    claimedDomain: "parcel.example",
    endpoint: "https://parcel.example/agent",
    category: "Commerce",
    capabilities: ["checkout", "scheduling"],
    status: "domain_verified",
    domainCheck: {
      simulated: true,
      method: "HTTP well-known challenge",
      result: "passed",
      recordedAt: "2026-10-01",
    },
    illustrative: true,
  },
];

export function getDemoAgent(id: string): DemoAgent | undefined {
  return DEMO_AGENTS.find((agent) => agent.id === id);
}

export function statusLabel(status: DemoStatus): string {
  if (status === "domain_verified") {
    return "Sample · Domain verified (simulated)";
  }
  return "Sample · Registered";
}

export const DEMO_NOTICE =
  "These records are fictional samples for the interface. None of them are live identities. A domain-verified label here is simulated. It does not mean an agent is safe, trustworthy, legally identified, or operating as described.";
