export const NO_STORE = { "Cache-Control": "no-store" };

export function jsonNoStore(body: unknown, status: number, extra?: Record<string, string>) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}
