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
    <div className={`mx-auto flex w-full ${showPrompt ? "max-w-lg" : "max-w-sm"} flex-col items-center text-center ${className}`}>
      <p className="text-xs font-light text-zinc-400">
        Paste this into your agent. It reads the docs and registers itself.
      </p>
      {showPrompt ? (
        <pre className="mt-3 max-h-48 w-full overflow-auto whitespace-pre-wrap border border-dashed border-zinc-800 p-3 text-left font-mono text-xs leading-5 text-zinc-300">
          {AGENT_PROMPT}
        </pre>
      ) : null}
      <button
        type="button"
        onClick={() => void copy()}
        className="mt-3 inline-flex cursor-pointer items-center border border-zinc-800 px-3.5 py-1.5 text-xs text-white transition-colors hover:border-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {copied ? "Copied" : "Copy prompt"}
      </button>
      <p className="sr-only" aria-live="polite">
        {copied ? "Prompt copied." : failed ? "Copy is unavailable." : ""}
      </p>
      {failed ? (
        <div className="mt-3 w-full text-left">
          <p className="text-center text-xs text-zinc-400">
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
