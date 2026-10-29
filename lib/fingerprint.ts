export interface FingerprintNode {
  x: number;
  y: number;
  r: number;
}

export interface FingerprintLink {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Fingerprint {
  rings: number[];
  nodes: FingerprintNode[];
  links: FingerprintLink[];
}

function fnv1a(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function fingerprint(source: string): Fingerprint {
  const random = mulberry32(fnv1a(source));
  const ringCount = 2 + Math.floor(random() * 2);
  const rings = Array.from({ length: ringCount }, (_, index) => 16 + index * 12 + random() * 4);
  const count = 8 + Math.floor(random() * 5);
  const nodes = Array.from({ length: count }, () => {
    const ring = rings[Math.floor(random() * rings.length)] ?? rings[0];
    const angle = random() * Math.PI * 2;
    return {
      x: 50 + Math.cos(angle) * ring,
      y: 50 + Math.sin(angle) * ring,
      r: 0.85 + random() * 1.15,
    };
  });
  const links: FingerprintLink[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const current = nodes[index];
    const next = nodes[(index + 1) % nodes.length];
    links.push({ x1: current.x, y1: current.y, x2: next.x, y2: next.y });
    if (random() > 0.42) {
      const chord = nodes[(index + 3) % nodes.length];
      links.push({ x1: current.x, y1: current.y, x2: chord.x, y2: chord.y });
    }
  }
  return { rings, nodes, links };
}
