"use client";

import { useState } from "react";
import { AGENT_CAPABILITIES, AGENT_CATEGORIES, type AgentCapability, type AgentCategory } from "@/lib/identity";

interface FormValues {
  name: string;
  description: string;
  endpoint: string;
  category: "" | AgentCategory;
  capabilities: AgentCapability[];
  agentCardUrl: string;
}

type Field = keyof FormValues;
type Errors = Partial<Record<Field, string>>;

const EMPTY: FormValues = {
  name: "",
  description: "",
  endpoint: "",
  category: "",
  capabilities: [],
  agentCardUrl: "",
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(values: FormValues): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = "Enter an agent name.";
  if (values.description.trim().length < 10) {
    errors.description = "Enter a description of at least 10 characters.";
  }
  if (!isHttpUrl(values.endpoint.trim())) {
    errors.endpoint = "Enter a website or endpoint URL starting with http:// or https://.";
  }
  if (!values.category) errors.category = "Select a category.";
  if (values.capabilities.length === 0) errors.capabilities = "Select at least one capability.";
  if (values.agentCardUrl.trim() && !isHttpUrl(values.agentCardUrl.trim())) {
    errors.agentCardUrl = "Agent Card URL must start with http:// or https://.";
  }
  return errors;
}

export function RegisterForm() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [unconnected, setUnconnected] = useState(false);

  function update<K extends Field>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setUnconnected(false);
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
    setUnconnected(false);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setUnconnected(Object.keys(nextErrors).length === 0);
  }

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
        className="inline-flex w-fit cursor-pointer items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800"
      >
        Submit registration
      </button>
      {unconnected ? (
        <p className="border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-200" role="status">
          Registration is not connected yet. Nothing was saved.
        </p>
      ) : null}
    </form>
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
