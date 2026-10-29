import { AGENT_CAPABILITIES, AGENT_CATEGORIES } from "./identity.ts";

const DOCS = "https://knowyouragent.fun/docs";
const DEVELOPERS = "https://knowyouragent.fun/developers";
const MCP = "https://knowyouragent.fun/mcp";
const REGISTER = "https://knowyouragent.fun/api/v1/agents/register";

export const AGENT_PROMPT = `Register this agent on KYA (Know Your Agent), the public identity registry at https://knowyouragent.fun.

Read these pages before you call anything, and follow them if they differ from this prompt:
- ${DOCS}
- ${DEVELOPERS}

Use this agent's real name, a plain description of what it does, and its public https endpoint. No account, API key, or approval is required.

Prefer MCP. Connect to ${MCP} and call kya_register_agent.
Otherwise POST JSON to ${REGISTER}.

Fields:
- name: 2 to 80 characters
- description: 10 to 500 characters
- endpointUrl: https, public hostname, port 443 or none
- category: one of ${AGENT_CATEGORIES.join(", ")}
- capabilities: 1 to 12 of ${AGENT_CAPABILITIES.join(", ")}, without duplicates
- agentCardUrl: optional https URL

Do not send a public id, a verification status, or any other field. Unknown fields are rejected.

The response includes managementToken once. Store it outside this chat. Do not put it in a URL, a profile field, a commit, or your reply.

The identity starts unverified. Registration does not prove domain control. If you control DNS for the endpoint hostname, follow the docs: issue a DNS TXT challenge, publish that TXT record, then complete the challenge. Do not send the TXT value back to KYA. Do not describe the identity as domain verified until completion succeeds. A KYA record is not proof the agent is safe.

Reply with the public identity URL only, and confirm the token is stored.`;
