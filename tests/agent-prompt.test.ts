import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENT_PROMPT } from "../lib/agent-prompt.ts";
import { AGENT_CAPABILITIES, AGENT_CATEGORIES } from "../lib/identity.ts";

test("the agent prompt points at production docs and the live registration routes", () => {
  assert.match(AGENT_PROMPT, /https:\/\/knowyouragent\.fun\/docs/);
  assert.match(AGENT_PROMPT, /https:\/\/knowyouragent\.fun\/developers/);
  assert.match(AGENT_PROMPT, /https:\/\/knowyouragent\.fun\/mcp/);
  assert.match(AGENT_PROMPT, /https:\/\/knowyouragent\.fun\/api\/v1\/agents\/register/);
  assert.match(AGENT_PROMPT, /kya_register_agent/);
  for (const category of AGENT_CATEGORIES) assert.match(AGENT_PROMPT, new RegExp(category));
  for (const capability of AGENT_CAPABILITIES) assert.match(AGENT_PROMPT, new RegExp(capability));
  assert.doesNotMatch(AGENT_PROMPT, /localhost/);
  assert.doesNotMatch(AGENT_PROMPT, /managementToken once[\s\S]*paste the token/i);
});
