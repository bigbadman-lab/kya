"use client";

import { useState } from "react";

export function TokenMintCopy({ mint }: { mint: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(mint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="relative z-10 mt-8 flex w-full max-w-xl items-center gap-3 border border-dashed border-zinc-800 px-4 py-3 text-left"
    >
      <span className="shrink-0 text-xs text-zinc-400">Official token</span>
      <span className="min-w-0 flex-1 break-all font-mono text-xs text-zinc-100">{mint}</span>
      <span className="shrink-0 text-xs text-white" aria-live="polite">
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
