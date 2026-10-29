import { IdentityFingerprint } from "@/components/identity-fingerprint";
import { snapshotLine, type IdentityCardModel } from "@/lib/identity-card";

export function IdentityCardImage({ card, generatedAt }: { card: IdentityCardModel; generatedAt: Date }) {
  const verified = card.tone === "verified";
  const inactive = card.tone === "inactive";
  const accent = verified ? "#6ee7b7" : inactive ? "#71717a" : "#d4d4d8";
  const line = verified ? "#064e3b" : "#27272a";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#000000",
        color: "#ffffff",
        padding: "42px",
        border: `2px solid ${line}`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 780 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 18, letterSpacing: 6, color: "#a1a1aa" }}>KYA</div>
          <div style={{ display: "flex", fontSize: 18, letterSpacing: 3, color: accent }}>{card.badge}</div>
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: inactive ? 36 : 58, fontWeight: 500, lineHeight: 1.1 }}>
          {card.name ?? card.publicId}
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 22, color: "#a1a1aa" }}>
          {card.category || card.host ? [card.category, card.host].filter(Boolean).join("  ·  ") : card.support}
        </div>
        {card.capabilities.length > 0 ? (
          <div style={{ display: "flex", marginTop: 28 }}>
            {card.capabilities.map((capability) => (
              <div
                key={capability}
                style={{ display: "flex", border: "1px solid #27272a", color: "#d4d4d8", fontSize: 18, padding: "6px 10px", marginRight: 12 }}
              >
                {capability}
              </div>
            ))}
            {card.extraCapabilities > 0 ? (
              <div style={{ display: "flex", color: "#71717a", fontSize: 18, padding: "6px 4px" }}>+{card.extraCapabilities}</div>
            ) : null}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ display: "flex", fontSize: 24, color: "#e4e4e7" }}>{card.publicId}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 16, color: "#71717a" }}>
            <div style={{ display: "flex" }}>knowyouragent.fun</div>
            <div style={{ display: "flex" }}>{snapshotLine(generatedAt)}</div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginLeft: 28 }}>
        <IdentityFingerprint publicId={card.publicId} color={accent} size={250} />
      </div>
    </div>
  );
}
