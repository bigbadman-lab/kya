"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AGENT_CAPABILITIES,
  AGENT_CATEGORIES,
  isPublicAgentIdentity,
  type AgentCapability,
  type AgentCategory,
  type PublicAgentIdentity,
  type PublicIdentity,
} from "@/lib/identity";

interface Challenge {
  challengeId: string;
  txtName: string;
  publishedToken: string;
  expiresAt: string;
  instructions: string;
}

interface ProfileDraft {
  name: string;
  description: string;
  endpointUrl: string;
  category: AgentCategory | "";
  capabilities: AgentCapability[];
  agentCardUrl: string;
}

const inputClass =
  "mt-2 w-full border border-zinc-800 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500";

export function ManageAgent() {
  const [publicId, setPublicId] = useState("");
  const [token, setToken] = useState("");
  const [identity, setIdentity] = useState<PublicIdentity | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [rotatedToken, setRotatedToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState("");
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmRevokeCredential, setConfirmRevokeCredential] = useState(false);
  const [confirmRevokeIdentity, setConfirmRevokeIdentity] = useState(false);
  const [inspection, setInspection] = useState<InspectionView | null>(null);

  const active = identity && isPublicAgentIdentity(identity) ? identity : null;

  async function openIdentity() {
    setError("");
    setNotice("");
    setChallenge(null);
    setRotatedToken(null);
    const id = publicId.trim();
    if (!/^kya_[0-9a-hjkmnp-tv-z]{26}$/.test(id)) {
      setError("Enter a public KYA id.");
      return;
    }
    if (!/^kya_mgmt_[0-9a-hjkmnp-tv-z]{52}$/.test(token)) {
      setError("Enter the management token for this identity.");
      return;
    }
    setPending("Opening…");
    const result = await send(`/api/v1/agents/${id}`, "GET", token);
    setPending("");
    if (!result.ok || !isIdentity(result.body)) {
      setIdentity(null);
      setDraft(null);
      setError(safeMessage(result.body, "The identity could not be opened."));
      return;
    }
    setIdentity(result.body);
    setDraft(isPublicAgentIdentity(result.body) ? draftFrom(result.body) : null);
    setInspection(null);
    setNotice("The token is held in memory for this page only. Refreshing or leaving clears it.");
  }

  async function saveProfile() {
    if (!active || !draft) return;
    setError("");
    setNotice("");
    if (!draft.category || draft.capabilities.length === 0) {
      setError("Select a category and at least one capability.");
      return;
    }
    setPending("Saving…");
    const result = await send(`/api/v1/agents/${active.publicId}`, "PATCH", token, {
      name: draft.name,
      description: draft.description,
      endpointUrl: draft.endpointUrl,
      category: draft.category,
      capabilities: draft.capabilities,
      agentCardUrl: draft.agentCardUrl,
    });
    setPending("");
    if (!result.ok || !isIdentity(result.body) || !isPublicAgentIdentity(result.body)) {
      setError(safeMessage(result.body, "The profile could not be saved."));
      return;
    }
    setIdentity(result.body);
    setDraft(draftFrom(result.body, draft.agentCardUrl));
    setInspection(null);
    setNotice(
      result.body.claimedHost === active.claimedHost
        ? "Profile saved. Domain verification was left as it was."
        : "Profile saved. The hostname changed, so domain verification was cleared.",
    );
  }

  async function issueChallenge() {
    if (!active) return;
    setError("");
    setNotice("");
    setPending("Requesting a DNS challenge…");
    const result = await send(`/api/v1/agents/${active.publicId}/challenges`, "POST", token, { method: "dns_txt" });
    setPending("");
    if (!result.ok || !isChallenge(result.body)) {
      setError(safeMessage(result.body, "The challenge could not be issued."));
      return;
    }
    setChallenge(result.body);
    setNotice("A new challenge replaces any previous pending challenge. It expires in 15 minutes.");
  }

  async function completeChallenge() {
    if (!active || !challenge) return;
    setError("");
    setNotice("");
    setPending("Checking DNS…");
    const result = await send(
      `/api/v1/agents/${active.publicId}/challenges/${challenge.challengeId}/complete`,
      "POST",
      token,
      {},
    );
    setPending("");
    if (!result.ok || !isIdentity(result.body)) {
      setError(safeMessage(result.body, "Domain verification did not succeed."));
      return;
    }
    setIdentity(result.body);
    if (isPublicAgentIdentity(result.body)) setDraft(draftFrom(result.body, draft?.agentCardUrl ?? ""));
    setChallenge(null);
    setNotice("Domain verification succeeded. It expires in 90 days and is not a safety or identity check.");
  }

  async function rotateToken() {
    if (!identity || !confirmRotate) return;
    setError("");
    setNotice("");
    setPending("Rotating the token…");
    const result = await send(`/api/v1/agents/${identity.publicId}/credentials/rotate`, "POST", token, {});
    setPending("");
    if (!result.ok || !isRotated(result.body)) {
      setError(safeMessage(result.body, "The token could not be rotated."));
      return;
    }
    setToken(result.body.managementToken);
    setRotatedToken(result.body.managementToken);
    setConfirmRotate(false);
    setNotice("The previous token no longer works. Store the new token before leaving this page.");
  }

  async function revokeCredential() {
    if (!identity || !confirmRevokeCredential) return;
    setError("");
    setNotice("");
    setPending("Revoking the credential…");
    const result = await send(`/api/v1/agents/${identity.publicId}/credentials/revoke`, "POST", token, {});
    setPending("");
    if (!result.ok) {
      setError(safeMessage(result.body, "The credential could not be revoked."));
      return;
    }
    setToken("");
    setRotatedToken(null);
    setChallenge(null);
    setConfirmRevokeCredential(false);
    setNotice("The management credential is revoked. This page cannot manage the identity anymore.");
  }

  async function changeLifecycle(action: "suspend" | "reinstate" | "revoke") {
    if (!identity) return;
    if (action === "revoke" && !confirmRevokeIdentity) return;
    setError("");
    setNotice("");
    setPending("Updating lifecycle…");
    const result = await send(`/api/v1/agents/${identity.publicId}/${action}`, "POST", token, {});
    setPending("");
    if (!result.ok || !isIdentity(result.body)) {
      setError(safeMessage(result.body, "The lifecycle could not be changed."));
      return;
    }
    setIdentity(result.body);
    setDraft(isPublicAgentIdentity(result.body) ? draftFrom(result.body, draft?.agentCardUrl ?? "") : null);
    setChallenge(null);
    setConfirmRevokeIdentity(false);
    setNotice(action === "revoke" ? "The identity is revoked. The public id stays reserved." : "Lifecycle updated.");
  }

  async function inspectAgent() {
    if (!active) return;
    setError("");
    setNotice("");
    setPending("Inspecting…");
    const result = await send(`/api/v1/agents/${active.publicId}/inspect`, "POST", token, {});
    setPending("");
    if (!result.ok || !isInspection(result.body)) {
      setError(safeMessage(result.body, "The inspection could not be completed."));
      return;
    }
    setInspection(result.body);
    setNotice(
      result.body.reused
        ? "This profile already has a current interpretation. No new analysis was run."
        : "Inspection saved. It interprets the self-reported profile and does not change domain verification.",
    );
  }

  return (
    <div className="mt-10 max-w-2xl">
      <p className="border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-200">
        This is not an account. The management token is kept in memory on this page and is not written to browser storage, cookies, or the address bar. Refreshing the page clears it.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <label className="text-sm text-zinc-200">
          Public KYA id
          <input
            value={publicId}
            onChange={(event) => setPublicId(event.target.value.trim())}
            autoComplete="off"
            spellCheck={false}
            className={inputClass}
          />
        </label>
        <label className="text-sm text-zinc-200">
          Management token
          <input
            value={token}
            onChange={(event) => setToken(event.target.value.trim())}
            type="password"
            autoComplete="off"
            spellCheck={false}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={openIdentity}
          disabled={pending !== ""}
          className="inline-flex w-fit cursor-pointer items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 disabled:cursor-wait disabled:opacity-70"
        >
          {pending === "Opening…" ? "Opening…" : "Open identity"}
        </button>
      </div>

      {error ? (
        <p className="mt-6 border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-200" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="mt-6 text-sm/5.5 font-light text-zinc-400">{notice}</p> : null}

      {identity ? (
        <section className="mt-10 border border-dashed border-zinc-800 px-5 py-6">
          <h2 className="text-2xl font-medium text-white">Managed identity</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Public id</dt>
              <dd className="mt-1 break-all font-mono text-zinc-200">{identity.publicId}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Lifecycle</dt>
              <dd className="mt-1 text-zinc-200">{identity.lifecycle}</dd>
            </div>
            {active ? (
              <div>
                <dt className="text-xs text-zinc-500">Domain verification</dt>
                <dd className="mt-1 text-zinc-200">
                  {active.domainVerification}
                  {active.verificationExpiresAt ? ` until ${active.verificationExpiresAt}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-4 text-sm/5.5 font-light text-zinc-400">
            Domain verification shows control of the claimed host. It does not prove that the agent is safe, that a person has been identified, or that the endpoint is authentic at runtime.
          </p>
          <Link href={identity.identityUrl} className="mt-4 inline-flex text-sm text-white underline decoration-zinc-700 underline-offset-4">
            Public profile
          </Link>
        </section>
      ) : null}

      {active ? (
        <section className="mt-10 border border-dashed border-zinc-800 px-5 py-6">
          <h2 className="text-2xl font-medium text-white">Agent Inspector</h2>
          <p className="mt-3 text-sm/5.5 font-light text-zinc-400">
            Ask for an interpretation of the stored profile. The request uses the token held in memory on this page. It does not change registration or domain verification. If the name, description, category, capabilities, hostname, endpoint, or agent card URL change, request it again. The previous reading is then stale.
          </p>
          <button
            type="button"
            onClick={inspectAgent}
            disabled={pending !== ""}
            className="mt-5 cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:border-zinc-600 disabled:opacity-70"
          >
            {pending === "Inspecting…" ? "Inspecting…" : "Inspect agent"}
          </button>
          {inspection ? (
            <div className="mt-6 text-sm/5.5 font-light text-zinc-300">
              <p className="text-zinc-200">{inspection.label}</p>
              <p className="mt-4">{inspection.summary}</p>
              <p className="mt-4">{inspection.capabilitiesInterpretation}</p>
              <ul className="mt-4 space-y-2">
                {inspection.useCases.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-4">{inspection.limitations}</p>
              <p className="mt-4 text-zinc-500">{inspection.evidence}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {active && draft ? (
        <section className="mt-10">
          <h2 className="text-2xl font-medium text-white">DNS verification</h2>
          <p className="mt-3 text-sm/5.5 font-light text-zinc-400">
            Request a challenge, publish the TXT record, then check it. Issuing another challenge expires the previous one. Verification lasts 90 days.
          </p>
          <button
            type="button"
            onClick={issueChallenge}
            disabled={pending !== ""}
            className="mt-5 cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:border-zinc-600 disabled:opacity-70"
          >
            {pending === "Requesting a DNS challenge…" ? "Requesting…" : "Issue DNS challenge"}
          </button>
          {challenge ? (
            <div className="mt-6 border border-dashed border-zinc-800 px-5 py-6">
              <p className="text-sm text-zinc-200">
                Publish a TXT record at the name below. The value is the token, with no extra words. This token is shown once on this page.
              </p>
              <CopyRow label="TXT name" value={challenge.txtName} />
              <CopyRow label="TXT value" value={challenge.publishedToken} />
              <p className="mt-4 text-xs text-zinc-500">Expires {challenge.expiresAt}</p>
              <p className="mt-3 text-sm/5.5 font-light text-zinc-400">{challenge.instructions}</p>
              <button
                type="button"
                onClick={completeChallenge}
                disabled={pending !== ""}
                className="mt-5 inline-flex cursor-pointer items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-70"
              >
                {pending === "Checking DNS…" ? "Checking DNS…" : "Check DNS record"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {active && draft ? (
        <section className="mt-12">
          <h2 className="text-2xl font-medium text-white">Profile</h2>
          <p className="mt-3 text-sm/5.5 font-light text-zinc-400">
            Changing the endpoint hostname clears domain verification. A blank Agent Card URL clears any stored card. The public profile does not show the current card URL.
          </p>
          <div className="mt-6 flex flex-col gap-6">
            <label className="text-sm text-zinc-200">
              Agent name
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="text-sm text-zinc-200">
              Description
              <textarea
                rows={4}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="text-sm text-zinc-200">
              Endpoint URL
              <input
                value={draft.endpointUrl}
                onChange={(event) => setDraft({ ...draft, endpointUrl: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="text-sm text-zinc-200">
              Category
              <select
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value as AgentCategory })}
                className={inputClass}
              >
                <option value="">Select a category</option>
                {AGENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="text-sm text-zinc-200">Capabilities</legend>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {AGENT_CAPABILITIES.map((capability) => (
                  <label key={capability} className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={draft.capabilities.includes(capability)}
                      onChange={() => {
                        const has = draft.capabilities.includes(capability);
                        setDraft({
                          ...draft,
                          capabilities: has
                            ? draft.capabilities.filter((item) => item !== capability)
                            : [...draft.capabilities, capability],
                        });
                      }}
                      className="accent-white"
                    />
                    {capability}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-sm text-zinc-200">
              A2A Agent Card URL (optional)
              <input
                value={draft.agentCardUrl}
                onChange={(event) => setDraft({ ...draft, agentCardUrl: event.target.value })}
                placeholder="https://"
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={saveProfile}
              disabled={pending !== ""}
              className="inline-flex w-fit cursor-pointer items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-70"
            >
              {pending === "Saving…" ? "Saving…" : "Save profile"}
            </button>
          </div>
        </section>
      ) : null}

      {identity && token ? (
        <section className="mt-12 border-t border-dashed border-zinc-800 pt-8">
          <h2 className="text-2xl font-medium text-white">Credential</h2>
          <label className="mt-4 flex items-start gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={confirmRotate}
              onChange={(event) => setConfirmRotate(event.target.checked)}
              className="mt-1 accent-white"
            />
            I understand rotation invalidates the current token and the new token is shown once.
          </label>
          <button
            type="button"
            onClick={rotateToken}
            disabled={pending !== "" || !confirmRotate}
            className="mt-4 cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {pending === "Rotating the token…" ? "Rotating…" : "Rotate management token"}
          </button>
          {rotatedToken ? (
            <div className="mt-5">
              <p className="border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-200">
                Store this token now. It replaces the previous one and will not be shown again after you leave this page.
              </p>
              <CopyRow label="New management token" value={rotatedToken} />
            </div>
          ) : null}
          <label className="mt-8 flex items-start gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={confirmRevokeCredential}
              onChange={(event) => setConfirmRevokeCredential(event.target.checked)}
              className="mt-1 accent-white"
            />
            Revoke the management credential. There is no recovery if this identity has no owner account.
          </label>
          <button
            type="button"
            onClick={revokeCredential}
            disabled={pending !== "" || !confirmRevokeCredential}
            className="mt-4 cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Revoke credential
          </button>
        </section>
      ) : null}

      {identity && token ? (
        <section className="mt-12 border-t border-dashed border-zinc-800 pt-8">
          <h2 className="text-2xl font-medium text-white">Lifecycle</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {identity.lifecycle === "active" ? (
              <button
                type="button"
                onClick={() => changeLifecycle("suspend")}
                disabled={pending !== ""}
                className="cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Suspend
              </button>
            ) : null}
            {identity.lifecycle === "suspended" ? (
              <button
                type="button"
                onClick={() => changeLifecycle("reinstate")}
                disabled={pending !== ""}
                className="cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Reinstate
              </button>
            ) : null}
          </div>
          {identity.lifecycle !== "revoked" ? (
            <>
              <label className="mt-6 flex items-start gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={confirmRevokeIdentity}
                  onChange={(event) => setConfirmRevokeIdentity(event.target.checked)}
                  className="mt-1 accent-white"
                />
                Revoke this identity. The public id cannot be reused, and the management credential stops working.
              </label>
              <button
                type="button"
                onClick={() => changeLifecycle("revoke")}
                disabled={pending !== "" || !confirmRevokeIdentity}
                className="mt-4 cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Revoke identity
              </button>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 break-all border border-zinc-800 bg-black px-3 py-2 font-mono text-xs text-zinc-200">{value}</p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
        className="mt-2 cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white"
      >
        {copied ? "Copied" : `Copy ${label.toLowerCase()}`}
      </button>
    </div>
  );
}

async function send(path: string, method: string, token?: string, body?: unknown) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body: payload };
}

function safeMessage(body: unknown, fallback: string): string {
  if (typeof body !== "object" || body === null || !("message" in body)) return fallback;
  const message = body.message;
  if (typeof message !== "string" || message.length > 300 || /kya_(mgmt|chal)_/.test(message)) return fallback;
  return message;
}

interface InspectionView {
  label: string;
  summary: string;
  capabilitiesInterpretation: string;
  useCases: string[];
  limitations: string;
  evidence: string;
  reused: boolean;
}

function isInspection(value: unknown): value is InspectionView {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.status === "current" &&
    typeof record.label === "string" &&
    typeof record.summary === "string" &&
    typeof record.capabilitiesInterpretation === "string" &&
    Array.isArray(record.useCases) &&
    record.useCases.every((item) => typeof item === "string") &&
    typeof record.limitations === "string" &&
    typeof record.evidence === "string" &&
    typeof record.reused === "boolean" &&
    !/kya_mgmt_|sk-/.test(JSON.stringify(record))
  );
}

function isIdentity(value: unknown): value is PublicIdentity {
  return typeof value === "object" && value !== null && "publicId" in value && "lifecycle" in value && "registered" in value;
}

function isChallenge(value: unknown): value is Challenge {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.challengeId === "string" &&
    typeof record.txtName === "string" &&
    typeof record.publishedToken === "string" &&
    typeof record.expiresAt === "string" &&
    typeof record.instructions === "string"
  );
}

function isRotated(value: unknown): value is { managementToken: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "managementToken" in value &&
    typeof value.managementToken === "string"
  );
}

function draftFrom(identity: PublicAgentIdentity, agentCardUrl = ""): ProfileDraft {
  return {
    name: identity.name,
    description: identity.description,
    endpointUrl: identity.endpointUrl,
    category: identity.category,
    capabilities: identity.capabilities,
    agentCardUrl,
  };
}
