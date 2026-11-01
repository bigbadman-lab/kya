"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { AGENT_PROMPT } from "@/lib/agent-prompt";

const ASSISTANTS = [
  { name: "ChatGPT", src: "/brands/openai.svg" },
  { name: "Grok", src: "/brands/grok.svg" },
  { name: "Claude", src: "/brands/claude.svg" },
] as const;

export function AgentPromptCta({
  showPrompt = false,
  className = "",
}: {
  showPrompt?: boolean;
  className?: string;
}) {
  const promptId = useId();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

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
    <div className={`mx-auto w-[min(100%,24rem)] ${className}`}>
      <div className="flex min-h-14 items-center gap-2 border border-zinc-800 bg-black px-2.5 sm:min-h-16 sm:gap-3 sm:px-3.5">
        <ul className="flex shrink-0 items-center gap-1.5">
          {ASSISTANTS.map((assistant) => (
            <li key={assistant.name}>
              <Image
                src={assistant.src}
                alt={assistant.name}
                title={assistant.name}
                width={18}
                height={18}
                className="h-[18px] w-[18px]"
              />
            </li>
          ))}
        </ul>
        <div className="min-w-0">
          <p className="text-sm leading-tight text-white">Register with your AI</p>
          <p className="hidden truncate text-xs text-zinc-500 sm:block">ChatGPT · Grok · Claude</p>
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="ml-auto inline-flex h-8 min-w-[6.75rem] shrink-0 cursor-pointer items-center justify-center bg-white px-2.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {copied ? "Copied" : "Copy Prompt"}
        </button>
      </div>
      <p className="sr-only">
        These marks name assistants you can paste the prompt into. KYA is not an official integration or partnership.
      </p>
      <p className="sr-only" aria-live="polite">
        {copied ? "Prompt copied." : failed ? "Copy is unavailable. Select the prompt below." : ""}
      </p>
      {showPrompt ? (
        <div className="mt-2">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={promptId}
            onClick={() => setOpen((current) => !current)}
            className="text-xs text-zinc-400 underline decoration-zinc-700 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {open ? "Hide prompt" : "View prompt"}
          </button>
          <pre
            id={promptId}
            hidden={!open}
            className="mt-2 max-h-48 overflow-x-hidden overflow-y-auto border border-dashed border-zinc-800 p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-zinc-300"
          >
            {AGENT_PROMPT}
          </pre>
        </div>
      ) : null}
      {failed ? (
        <div className="mt-2">
          <p className="text-xs text-zinc-400">Copy is unavailable. Select the prompt and paste it into your assistant.</p>
          <textarea
            readOnly
            value={AGENT_PROMPT}
            rows={8}
            aria-label="Agent registration prompt"
            className="mt-2 w-full border border-zinc-800 bg-black px-3 py-2.5 text-base text-zinc-200"
          />
        </div>
      ) : null}
    </div>
  );
}
