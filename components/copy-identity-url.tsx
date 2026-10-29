"use client";

import { useState } from "react";

export function CopyIdentityUrl({ path }: { path: string }) {
  const [message, setMessage] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  async function onCopy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setManualUrl("");
      setMessage("Copied the identity URL.");
    } catch {
      setManualUrl(url);
      setMessage("Copy is unavailable in this browser. Select the address below.");
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onCopy}
        className="cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:border-zinc-600"
      >
        Copy identity URL
      </button>
      {message ? (
        <p className="mt-2 text-xs text-zinc-400" role="status">
          {message}
        </p>
      ) : null}
      {manualUrl ? (
        <input
          readOnly
          value={manualUrl}
          aria-label="Identity URL"
          className="mt-2 w-full border border-zinc-800 bg-black px-3 py-2 font-mono text-xs text-zinc-300"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
