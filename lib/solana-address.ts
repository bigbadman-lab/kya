const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function solanaAddress(value: string): string | null {
  const address = value.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return null;

  const base = BigInt(58);
  const byte = BigInt(256);
  let magnitude = BigInt(0);
  for (const character of address) {
    const digit = ALPHABET.indexOf(character);
    if (digit < 0) return null;
    magnitude = magnitude * base + BigInt(digit);
  }

  const body: number[] = [];
  while (magnitude > BigInt(0)) {
    body.push(Number(magnitude % byte));
    magnitude /= byte;
  }
  body.reverse();

  const leadingZeros = address.match(/^1*/)?.[0].length ?? 0;
  if (leadingZeros + body.length !== 32) return null;
  return address;
}
