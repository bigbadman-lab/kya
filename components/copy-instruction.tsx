"use client";

import { useState } from "react";

export function CopyInstruction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  }

  return (
    <div className="border border-dashed border-zinc-800">
      <p className="px-4 py-4 text-sm/5.5 text-zinc-200">{text}</p>
      <div className="border-t border-dashed border-zinc-800 px-4 py-3">
        <button
          type="button"
          onClick={copy}
          className="cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:border-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {copied ? "Copied" : "Copy instructions"}
        </button>
        {failed ? <p className="mt-2 text-xs text-zinc-400">Copy is unavailable. Select the instructions and copy them.</p> : null}
      </div>
    </div>
  );
}
