"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IdentityCard } from "@/components/identity-card";
import { IdentityCardActions } from "@/components/identity-card-actions";
import { AGENT_CAPABILITIES, AGENT_CATEGORIES, type AgentCapability, type AgentCategory } from "@/lib/identity";
import { cardFromRegistration } from "@/lib/identity-card";

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

const STEPS = [
  { title: "Profile", prompt: "What should people call this agent?" },
  { title: "Endpoint", prompt: "Where does it live, and what can it do?" },
  { title: "Create", prompt: "Check the record. It starts unverified." },
] as const;

function stepFor(nextErrors: Errors): number {
  if (nextErrors.name || nextErrors.description) return 0;
  if (nextErrors.endpoint || nextErrors.category || nextErrors.capabilities) return 1;
  return 2;
}

export function RegisterForm() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState<IssuedIdentity | null>(null);
  const [step, setStep] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      return;
    }
    panelRef.current?.focus();
    panelRef.current?.scrollIntoView({ block: "nearest" });
  }, [step, issued]);

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

  function continueStep() {
    const nextErrors = validate(values);
    const visible: Errors = {};
    if (step === 0) {
      if (nextErrors.name) visible.name = nextErrors.name;
      if (nextErrors.description) visible.description = nextErrors.description;
    }
    if (step === 1) {
      if (nextErrors.endpoint) visible.endpoint = nextErrors.endpoint;
      if (nextErrors.category) visible.category = nextErrors.category;
      if (nextErrors.capabilities) visible.capabilities = nextErrors.capabilities;
    }
    setErrors(visible);
    if (Object.keys(visible).length > 0) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      continueStep();
      return;
    }
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStep(stepFor(nextErrors));
      return;
    }

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
        const nextErrors: Errors = {
          name: payload.fields?.name,
          description: payload.fields?.description,
          endpoint: payload.fields?.endpointUrl,
          category: payload.fields?.category,
          capabilities: payload.fields?.capabilities,
          agentCardUrl: payload.fields?.agentCardUrl,
          form: payload.message || payload.fields?.body || "Registration failed.",
        };
        setErrors(nextErrors);
        setStep(stepFor(nextErrors));
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

  if (issued) return <RegistrationResult issued={issued} profile={values} panelRef={panelRef} />;

  return (
    <form className="mt-10 max-w-2xl" onSubmit={onSubmit} noValidate>
      <ol className="grid grid-cols-3 gap-3" aria-label="Registration progress">
        {STEPS.map((item, index) => (
          <li key={item.title}>
            <p className={`text-xs ${index === step ? "text-white" : index < step ? "text-zinc-300" : "text-zinc-600"}`}>
              {index + 1}. {item.title}
            </p>
            <span className={`mt-2 block h-px ${index <= step ? "bg-white" : "bg-zinc-800"}`} />
          </li>
        ))}
      </ol>

      <div key={step} ref={panelRef} tabIndex={-1} className="kya-step mt-8 scroll-mt-24 outline-none">
        <h2 className="text-2xl font-medium text-white">{STEPS[step].prompt}</h2>
        <div className="mt-6 flex flex-col gap-6">
          {step === 0 ? (
            <>
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
            </>
          ) : null}
          {step === 1 ? (
            <>
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
                        className="size-4 accent-white"
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
            </>
          ) : null}
          {step === 2 ? (
            <>
              <dl className="space-y-3 border border-dashed border-zinc-800 px-4 py-4 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">Name</dt>
                  <dd className="mt-1 text-zinc-200">{values.name.trim()}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Description</dt>
                  <dd className="mt-1 text-zinc-200">{values.description.trim()}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Endpoint</dt>
                  <dd className="mt-1 break-all text-zinc-200">{values.endpoint.trim()}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Category</dt>
                  <dd className="mt-1 text-zinc-200">{values.category}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Capabilities</dt>
                  <dd className="mt-1 text-zinc-200">{values.capabilities.join(", ")}</dd>
                </div>
              </dl>
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
            </>
          ) : null}
          {errors.form ? (
            <p className="border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-200" role="alert">
              {errors.form}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((current) => current - 1)}
                disabled={pending}
                className="cursor-pointer border border-zinc-800 px-5 py-2.5 text-sm text-white transition-colors hover:border-zinc-600 disabled:opacity-70"
              >
                Back
              </button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={continueStep}
                className="inline-flex cursor-pointer items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={pending}
                className="inline-flex cursor-pointer items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 disabled:cursor-wait disabled:opacity-70"
              >
                {pending ? "Registering…" : "Create identity"}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

function RegistrationResult({
  issued,
  profile,
  panelRef,
}: {
  issued: IssuedIdentity;
  profile: FormValues;
  panelRef: React.RefObject<HTMLDivElement | null>;
}) {
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
  const card = cardFromRegistration({
    publicId: issued.publicId,
    identityUrl: issued.identityUrl,
    name: profile.name,
    category: profile.category,
    capabilities: profile.capabilities,
    endpoint: profile.endpoint,
  });

  return (
    <div ref={panelRef} tabIndex={-1} className="kya-step mt-10 max-w-2xl scroll-mt-24 border border-dashed border-zinc-800 px-5 py-6 outline-none">
      <h2 className="text-2xl font-medium text-white">Identity registered</h2>
      <p className="mt-3 text-sm/5.5 font-light text-zinc-400">
        The record exists and is unverified. Domain verification has not run. Store the management token before you leave. The card below is the public identity, and it starts registered.
      </p>
      <div className="mt-6">
        <IdentityCard card={card} />
        <IdentityCardActions card={card} />
      </div>
      <ol className="mt-6 space-y-6">
        <li>
          <p className="text-sm text-white">1. Store the management token</p>
          <p className="mt-2 text-sm/5.5 font-light text-zinc-400" role="status">
            This token is shown once. It is not saved in this browser. Refreshing the page hides it, and it cannot be shown again.
          </p>
          <p className="mt-3 break-all border border-zinc-800 bg-black px-3 py-2 font-mono text-base text-zinc-200">
            {issued.managementToken}
          </p>
          <button
            type="button"
            onClick={copyToken}
            className="mt-3 cursor-pointer bg-white px-4 py-2 text-sm font-medium text-zinc-800"
          >
            Copy management token
          </button>
          {copied ? <p className="mt-2 text-xs text-zinc-400">{copied}</p> : null}
        </li>
        <li>
          <p className="text-sm text-white">2. Open the public identity</p>
          <p className="mt-2 break-all font-mono text-sm text-zinc-400">{issued.publicId}</p>
          <Link href={identityHref} className="mt-2 inline-flex text-sm text-white underline decoration-zinc-700 underline-offset-4">
            {identityHref}
          </Link>
        </li>
        <li>
          <p className="text-sm text-white">3. Verify the domain from the dashboard</p>
          <p className="mt-2 text-sm/5.5 font-light text-zinc-400">{issued.dnsNextStep}</p>
          <p className="mt-2 text-sm/5.5 font-light text-zinc-400">
            Enter the public id and token on the dashboard. The link does not carry the token, and the dashboard does not read it from the address.
          </p>
          <Link href="/dashboard" className="mt-4 inline-flex items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Open the dashboard
          </Link>
        </li>
      </ol>
    </div>
  );
}

const inputClass =
  "mt-2 w-full border border-zinc-800 bg-black px-3 py-2.5 text-base text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500";

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
