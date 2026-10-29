"use client";

import { useState } from "react";
import Link from "next/link";
import { AGENT_CAPABILITIES, AGENT_CATEGORIES, type AgentCapability, type AgentCategory } from "@/lib/identity";

interface FormValues {
  name: string;
  description: string;
  endpoint: string;
  category: "" | AgentCategory;
  capabilities: AgentCapability[];
  agentCardUrl: string;
}

interface IssuedIdentity {
  publicId: string;
  identityUrl: string;
  domainVerification: string;
  managementToken: string;
  dnsNextStep: string;
}

type Field = keyof FormValues;
type Errors = Partial<Record<Field | "form", string>>;

const EMPTY: FormValues = {
  name: "",
  description: "",
  endpoint: "",
  category: "",
  capabilities: [],
  agentCardUrl: "",
};

function validate(values: FormValues): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2 || values.name.trim().length > 80) {
    errors.name = "Enter a name of 2 to 80 characters.";
  }
  if (values.description.trim().length < 10 || values.description.trim().length > 500) {
    errors.description = "Enter a description of 10 to 500 characters.";
  }
  if (!values.endpoint.trim().toLowerCase().startsWith("https://")) {
    errors.endpoint = "Enter an endpoint URL starting with https://.";
  }
  if (!values.category) errors.category = "Select a category.";
  if (values.capabilities.length === 0) errors.capabilities = "Select at least one capability.";
  if (values.agentCardUrl.trim() && !values.agentCardUrl.trim().toLowerCase().startsWith("https://")) {
    errors.agentCardUrl = "Agent Card URL must start with https://.";
  }
  return errors;
}

export function RegisterForm() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState<IssuedIdentity | null>(null);

  function update<K extends Field>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleCapability(capability: AgentCapability) {
    setValues((current) => {
      const has = current.capabilities.includes(capability);
      return {
        ...current,
        capabilities: has
          ? current.capabilities.filter((item) => item !== capability)
          : [...current.capabilities, capability],
      };
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      const response = await fetch("/api/v1/agents/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          endpointUrl: values.endpoint,
          category: values.category,
          capabilities: values.capabilities,
          ...(values.agentCardUrl.trim() ? { agentCardUrl: values.agentCardUrl } : {}),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        fields?: Partial<Record<"name" | "description" | "endpointUrl" | "category" | "capabilities" | "agentCardUrl" | "body", string>>;
        publicId?: string;
        identityUrl?: string;
        domainVerification?: string;
        managementToken?: string;
        dnsNextStep?: string;
      };
      if (!response.ok) {
        setErrors({
          name: payload.fields?.name,
          description: payload.fields?.description,
          endpoint: payload.fields?.endpointUrl,
          category: payload.fields?.category,
          capabilities: payload.fields?.capabilities,
          agentCardUrl: payload.fields?.agentCardUrl,
          form: payload.message || payload.fields?.body || "Registration failed.",
        });
        return;
      }
      if (!payload.publicId || !payload.identityUrl || !payload.managementToken || !payload.dnsNextStep) {
        setErrors({ form: "Registration did not return a usable identity." });
        return;
      }
      setIssued({
        publicId: payload.publicId,
        identityUrl: payload.identityUrl,
        domainVerification: payload.domainVerification ?? "unverified",
        managementToken: payload.managementToken,
        dnsNextStep: payload.dnsNextStep,
      });
    } catch {
      setErrors({ form: "Registration is unavailable." });
    } finally {
      setPending(false);
    }
  }

  if (issued) return <RegistrationResult issued={issued} />;

  return (
    <form className="mt-10 flex max-w-2xl flex-col gap-6" onSubmit={onSubmit} noValidate>
      <Field label="Agent name" htmlFor="agent-name" error={errors.name}>
        <input
          id="agent-name"
          name="name"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "agent-name-error" : undefined}
          className={inputClass}
        />
      </Field>
      <Field label="Description" htmlFor="agent-description" error={errors.description}>
        <textarea
          id="agent-description"
          name="description"
          rows={4}
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "agent-description-error" : undefined}
          className={inputClass}
        />
      </Field>
      <Field label="Website / agent endpoint" htmlFor="agent-endpoint" error={errors.endpoint}>
        <input
          id="agent-endpoint"
          name="endpoint"
          inputMode="url"
          placeholder="https://"
          value={values.endpoint}
          onChange={(event) => update("endpoint", event.target.value)}
          aria-invalid={Boolean(errors.endpoint)}
          aria-describedby={errors.endpoint ? "agent-endpoint-error" : undefined}
          className={inputClass}
        />
      </Field>
      <Field label="Category" htmlFor="agent-category" error={errors.category}>
        <select
          id="agent-category"
          name="category"
          value={values.category}
          onChange={(event) => update("category", event.target.value as FormValues["category"])}
          aria-invalid={Boolean(errors.category)}
          aria-describedby={errors.category ? "agent-category-error" : undefined}
          className={inputClass}
        >
          <option value="">Select a category</option>
          {AGENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </Field>
      <fieldset aria-describedby={errors.capabilities ? "agent-capabilities-error" : undefined}>
        <legend className="text-sm text-zinc-200">Capabilities</legend>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AGENT_CAPABILITIES.map((capability) => (
            <label key={capability} className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                name="capabilities"
                value={capability}
                checked={values.capabilities.includes(capability)}
                onChange={() => toggleCapability(capability)}
                className="accent-white"
              />
              {capability}
            </label>
          ))}
        </div>
        {errors.capabilities ? (
          <p id="agent-capabilities-error" className="mt-2 text-xs text-zinc-300">
            {errors.capabilities}
          </p>
        ) : null}
      </fieldset>
      <Field label="A2A Agent Card URL (optional)" htmlFor="agent-card" error={errors.agentCardUrl}>
        <input
          id="agent-card"
          name="agentCardUrl"
          inputMode="url"
          placeholder="https://"
          value={values.agentCardUrl}
          onChange={(event) => update("agentCardUrl", event.target.value)}
          aria-invalid={Boolean(errors.agentCardUrl)}
          aria-describedby={errors.agentCardUrl ? "agent-card-error" : undefined}
          className={inputClass}
        />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-fit cursor-pointer items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Registering…" : "Submit registration"}
      </button>
      {errors.form ? (
        <p className="border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-200" role="alert">
          {errors.form}
        </p>
      ) : null}
    </form>
  );
}

function RegistrationResult({ issued }: { issued: IssuedIdentity }) {
  const [copied, setCopied] = useState("");

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(issued.managementToken);
      setCopied("Copied the management token.");
    } catch {
      setCopied("Copy is unavailable. Select the token and store it somewhere safe.");
    }
  }

  const identityHref = issued.identityUrl;

  return (
    <div className="mt-10 max-w-2xl border border-dashed border-zinc-800 px-5 py-6">
      <h2 className="text-2xl font-medium text-white">Identity registered</h2>
      <p className="mt-3 text-sm/5.5 font-light text-zinc-400">
        The record is registered and unverified. Domain verification has not run.
      </p>
      <p className="mt-4 border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-200" role="status">
        This management token is shown once. Store it somewhere safe before leaving this page. It is not saved in this browser. Refreshing the page hides it, and it cannot be shown again.
      </p>
      <dl className="mt-6 space-y-5 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">KYA identifier</dt>
          <dd className="mt-1 break-all font-mono text-zinc-200">{issued.publicId}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Public identity URL</dt>
          <dd className="mt-1 break-all">
            <Link href={identityHref} className="text-white underline decoration-zinc-700 underline-offset-4">
              {identityHref}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Domain verification</dt>
          <dd className="mt-1 text-zinc-200">{issued.domainVerification === "unverified" ? "Unverified" : issued.domainVerification}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Management token</dt>
          <dd className="mt-1 break-all border border-zinc-800 bg-black px-3 py-2 font-mono text-xs text-zinc-200">
            {issued.managementToken}
          </dd>
          <button
            type="button"
            onClick={copyToken}
            className="mt-3 cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:border-zinc-600"
          >
            Copy management token
          </button>
          {copied ? <p className="mt-2 text-xs text-zinc-400">{copied}</p> : null}
        </div>
      </dl>
      <p className="mt-6 text-sm/5.5 font-light text-zinc-400">{issued.dnsNextStep}</p>
      <p className="mt-4 text-sm/5.5 font-light text-zinc-400">
        After the token is stored, open the dashboard and enter the public id and token there. This link does not include the token, and the dashboard does not read it from the address or save it in the browser.
      </p>
      <Link href="/dashboard" className="mt-4 inline-flex items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        Manage this agent
      </Link>
    </div>
  );
}

const inputClass =
  "mt-2 w-full border border-zinc-800 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500";

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm text-zinc-200">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-2 text-xs text-zinc-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
