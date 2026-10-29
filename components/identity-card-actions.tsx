"use client";

import { useState } from "react";
import { CopyIdentityUrl } from "@/components/copy-identity-url";
import { cardPngPath, downloadName, embedSnippet, shareUrl, type IdentityCardModel } from "@/lib/identity-card";

export function IdentityCardActions({ card }: { card: IdentityCardModel }) {
  const [embed, setEmbed] = useState("");
  const [message, setMessage] = useState("");
  const share = shareUrl(card);
  const snippet = embedSnippet(card);

  async function download() {
    setMessage("");
    try {
      const response = await fetch(cardPngPath(card.publicId), { cache: "no-store" });
      if (!response.ok) {
        setMessage("The card could not be downloaded.");
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadName(card.publicId);
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setMessage("The card could not be downloaded.");
    }
  }

  async function copyEmbed() {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setEmbed("");
      setMessage("Copied the embed snippet.");
    } catch {
      setEmbed(snippet);
      setMessage("Copy is unavailable. Select the embed snippet below.");
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void download()}
          className="cursor-pointer bg-white px-4 py-2 text-sm font-medium text-zinc-800"
        >
          Download card
        </button>
        {share ? (
          <a
            href={share}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:border-zinc-600"
          >
            Share on X
          </a>
        ) : null}
        {snippet ? (
          <button
            type="button"
            onClick={() => void copyEmbed()}
            className="cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:border-zinc-600"
          >
            Copy embed
          </button>
        ) : null}
      </div>
      {card.profilePath ? <CopyIdentityUrl path={card.profilePath} /> : null}
      {message ? <p className="mt-2 text-xs text-zinc-400">{message}</p> : null}
      <p className="mt-3 max-w-2xl text-xs font-light text-zinc-500">
        A download is a snapshot. The embed image is rendered from the live public identity and is not stored by KYA. Other sites may keep their own copy.
      </p>
      {embed ? (
        <textarea
          readOnly
          value={embed}
          rows={4}
          aria-label="Identity card embed snippet"
          className="mt-2 w-full border border-zinc-800 bg-black px-3 py-2.5 font-mono text-base text-zinc-200"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
