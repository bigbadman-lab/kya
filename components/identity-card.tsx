import { IdentityFingerprint } from "@/components/identity-fingerprint";
import type { IdentityCardModel } from "@/lib/identity-card";

export function IdentityCard({ card }: { card: IdentityCardModel }) {
  const verified = card.tone === "verified";
  const inactive = card.tone === "inactive";
  const accent = verified ? "#6ee7b7" : "#d4d4d8";
  const label = card.name ? `KYA identity card for ${card.name}` : `KYA identity ${card.publicId}`;

  return (
    <article
      aria-label={label}
      className={`relative w-full max-w-3xl overflow-hidden border bg-black ${verified ? "border-emerald-900" : "border-zinc-800"}`}
    >
      <div className={`absolute inset-x-0 top-0 h-px ${verified ? "bg-emerald-400" : "bg-zinc-700"}`} />
      <div className="flex flex-col gap-5 p-4 sm:aspect-[1200/630] sm:flex-row sm:items-stretch sm:justify-between sm:p-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] tracking-[0.22em] text-zinc-400">KYA</p>
            <p className={`text-[11px] tracking-[0.16em] ${verified ? "text-emerald-300" : "text-zinc-300"}`}>{card.badge}</p>
          </div>
          {card.illustrative ? (
            <p className="mt-3 text-[11px] tracking-[0.14em] text-zinc-500">ILLUSTRATIVE · NOT A REGISTERED AGENT</p>
          ) : null}
          <h3 className={`mt-4 max-w-xl font-medium leading-tight text-white ${inactive ? "text-lg" : "text-2xl sm:text-3xl"}`}>
            {card.name ?? card.publicId}
          </h3>
          {card.category || card.host ? (
            <p className="mt-2 truncate text-sm font-light text-zinc-400">
              {[card.category, card.host].filter(Boolean).join(" · ")}
            </p>
          ) : (
            <p className="mt-2 text-sm font-light text-zinc-500">{card.support}</p>
          )}
          {card.capabilities.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {card.capabilities.map((capability) => (
                <li key={capability} className="border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300">
                  {capability}
                </li>
              ))}
              {card.extraCapabilities > 0 ? (
                <li className="px-2 py-1 text-[11px] text-zinc-500">+{card.extraCapabilities}</li>
              ) : null}
            </ul>
          ) : null}
          <div className="mt-auto pt-6">
            <p className="break-all font-mono text-xs text-zinc-200 sm:text-sm">{card.publicId}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
              <p>knowyouragent.fun</p>
              <p>{card.support}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-center sm:pl-4">
          <IdentityFingerprint publicId={card.publicId} color={inactive ? "#52525b" : accent} size={148} />
        </div>
      </div>
    </article>
  );
}
