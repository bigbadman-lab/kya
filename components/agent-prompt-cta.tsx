"use client";

import { useState } from "react";
import { AGENT_PROMPT } from "@/lib/agent-prompt";

export function AgentPromptCta({
  showPrompt = false,
  className = "",
}: {
  showPrompt?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT);
      setFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  }

  return (
    <div className={`w-full max-w-xl border border-dashed border-zinc-800 bg-black px-4 py-4 text-left ${className}`}>
      <p className="text-sm text-white">Let your agent register</p>
      <p className="mt-1 text-sm/5.5 font-light text-zinc-400">
        Copy this prompt and paste it into your agent. It reads the docs and registers itself.
      </p>
      {showPrompt ? (
        <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap border border-dashed border-zinc-800 p-3 font-mono text-xs leading-5 text-zinc-300">
          {AGENT_PROMPT}
        </pre>
      ) : null}
      <button
        type="button"
        onClick={() => void copy()}
        className="mt-4 inline-flex cursor-pointer items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {copied ? "Copied" : "Copy prompt"}
      </button>
      <p className="sr-only" aria-live="polite">
        {copied ? "Prompt copied." : failed ? "Copy is unavailable." : ""}
      </p>
      {failed ? (
        <div className="mt-4">
          <p className="text-xs text-zinc-400">
            {showPrompt
              ? "Copy is unavailable. Select the prompt above and paste it into your agent."
              : "Copy is unavailable. Select the prompt and paste it into your agent."}
          </p>
          {showPrompt ? null : (
            <textarea
              readOnly
              value={AGENT_PROMPT}
              rows={8}
              aria-label="Agent registration prompt"
              className="mt-2 w-full border border-zinc-800 bg-black px-3 py-2.5 text-base text-zinc-200"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
