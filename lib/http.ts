export function unknownJsonFields(body: Record<string, unknown>, allowed: readonly string[]): string[] {
  return Object.keys(body).filter((key) => !allowed.includes(key));
}

export const NO_STORE = { "Cache-Control": "no-store" };

export function jsonNoStore(body: unknown, status: number, extra?: Record<string, string>) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}
