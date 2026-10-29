import { createHash } from "node:crypto";

export interface RateLimitSubjects {
  ipSubject: string;
  netSubject: string;
}

interface CanonicalAddress {
  version: 4 | 6;
  text: string;
  bytes: number[];
}

const HOST_LABEL =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function platformClientAddress(headerValue: string | null, hostname: string, onVercel: boolean): string | null {
  if (onVercel) {
    if (!headerValue) return null;
    const trimmed = headerValue.trim();
    if (!trimmed || trimmed.includes(",") || /\s/.test(trimmed)) return null;
    const address = canonicalAddress(trimmed);
    if (!address || !isGlobal(address)) return null;
    return address.text;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return "127.0.0.1";
  }
  return null;
}

export function rateLimitSubjects(address: string): RateLimitSubjects | null {
  const canonical = canonicalAddress(address);
  if (!canonical) return null;
  const prefix = networkPrefix(canonical);
  return {
    ipSubject: `ip:${digest(canonical.text)}`,
    netSubject: `net:${digest(prefix)}`,
  };
}

export function isPublicHostname(host: string): boolean {
  const normalized = host.endsWith(".") ? host.slice(0, -1) : host;
  if (
    normalized.length < 1 ||
    normalized.length > 253 ||
    normalized.includes(":") ||
    /[^a-z0-9.-]/.test(normalized) ||
    /^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(normalized) ||
    !HOST_LABEL.test(normalized) ||
    /(^|\.)(local|localhost|internal|home|arpa)$/.test(normalized)
  ) {
    return false;
  }
  return true;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalAddress(input: string): CanonicalAddress | null {
  if (input.startsWith("[") || input.includes("%")) return null;
  const mapped = input.toLowerCase().match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  const ipv4 = parseIpv4(mapped ? mapped[1] : input);
  if (ipv4) {
    return { version: 4, text: ipv4.join("."), bytes: ipv4 };
  }
  const ipv6 = parseIpv6(input);
  if (!ipv6) return null;
  if (ipv6.slice(0, 10).every((byte) => byte === 0) && ipv6[10] === 255 && ipv6[11] === 255) {
    const tail = ipv6.slice(12);
    return { version: 4, text: tail.join("."), bytes: tail };
  }
  const groups = [];
  for (let index = 0; index < 16; index += 2) {
    groups.push(((ipv6[index] << 8) | ipv6[index + 1]).toString(16).padStart(4, "0"));
  }
  return { version: 6, text: groups.join(":"), bytes: ipv6 };
}

function networkPrefix(address: CanonicalAddress): string {
  if (address.version === 4) {
    return `${address.bytes[0]}.${address.bytes[1]}.${address.bytes[2]}.0`;
  }
  const groups = [];
  for (let index = 0; index < 16; index += 2) {
    const high = index < 8 ? address.bytes[index] : 0;
    const low = index < 8 ? address.bytes[index + 1] : 0;
    groups.push(((high << 8) | low).toString(16).padStart(4, "0"));
  }
  return groups.join(":");
}

function isGlobal(address: CanonicalAddress): boolean {
  const [a, b] = address.bytes;
  if (address.version === 4) {
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a >= 224) return false;
    return true;
  }
  if (address.bytes.every((byte) => byte === 0)) return false;
  if (a === 0 && address.bytes.slice(1, 15).every((byte) => byte === 0) && address.bytes[15] === 1) return false;
  if ((a & 0xfe) === 0xfc) return false;
  if (a === 0xfe && (b & 0xc0) === 0x80) return false;
  if (a === 0xff) return false;
  return true;
}

function parseIpv4(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const bytes: number[] = [];
  for (const part of parts) {
    if (!/^[0-9]{1,3}$/.test(part) || (part.length > 1 && part.startsWith("0"))) return null;
    const byte = Number(part);
    if (byte > 255) return null;
    bytes.push(byte);
  }
  return bytes;
}

function parseIpv6(value: string): number[] | null {
  let text = value.toLowerCase();
  if (text.includes(".")) {
    const split = text.lastIndexOf(":");
    const tail = parseIpv4(text.slice(split + 1));
    if (!tail || split < 0) return null;
    const high = ((tail[0] << 8) | tail[1]).toString(16);
    const low = ((tail[2] << 8) | tail[3]).toString(16);
    text = `${text.slice(0, split)}:${high}:${low}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (halves.length === 1 && head.length !== 8) return null;
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 && missing < 1) return null;
  const groups = halves.length === 2 ? [...head, ...Array.from({ length: missing }, () => "0"), ...tail] : head;
  if (groups.length !== 8) return null;
  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    const word = Number.parseInt(group, 16);
    bytes.push(word >> 8, word & 0xff);
  }
  return bytes;
}
