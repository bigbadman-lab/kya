"use client";

import { useState } from "react";

export function CopyPassportUrl({ publicId }: { publicId: string }) {
  const [message, setMessage] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  async function onCopy() {
    const url = `${window.location.origin}/api/v1/agents/${publicId}/passport`;
    try {
      await navigator.clipboard.writeText(url);
      setManualUrl("");
      setMessage("Copied the passport URL.");
    } catch {
      setManualUrl(url);
      setMessage("Copy is unavailable in this browser. Select the address below.");
    }
  }

  return (
    <div className="mt-4 flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onCopy}
          className="cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:border-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Copy passport URL
        </button>
        <a
          href={`/api/v1/agents/${publicId}/passport`}
          className="text-sm text-white underline decoration-zinc-700 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          View JSON
        </a>
      </div>
      {message ? (
        <p className="text-xs text-zinc-400" role="status">
          {message}
        </p>
      ) : null}
      {manualUrl ? (
        <textarea
          readOnly
          value={manualUrl}
          aria-label="Passport URL"
          rows={2}
          className="w-full max-w-xl border border-zinc-800 bg-black px-3 py-2 font-mono text-base text-zinc-300"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
