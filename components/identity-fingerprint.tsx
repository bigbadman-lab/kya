import { fingerprint } from "@/lib/fingerprint";

export function IdentityFingerprint({
  publicId,
  color = "#d4d4d8",
  size = 168,
}: {
  publicId: string;
  color?: string;
  size?: number;
}) {
  const mark = fingerprint(publicId);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {mark.rings.map((radius) => (
        <circle key={radius} cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="0.35" opacity="0.4" />
      ))}
      {mark.links.map((link, index) => (
        <line
          key={`${link.x1}-${link.y1}-${index}`}
          x1={link.x1}
          y1={link.y1}
          x2={link.x2}
          y2={link.y2}
          stroke={color}
          strokeWidth="0.5"
          opacity="0.85"
        />
      ))}
      {mark.nodes.map((node, index) => (
        <circle key={`${node.x}-${index}`} cx={node.x} cy={node.y} r={node.r} fill={color} />
      ))}
      <circle cx="50" cy="50" r="1.3" fill={color} />
    </svg>
  );
}
