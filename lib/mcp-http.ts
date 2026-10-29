import { originValidationResponse, validateHostHeader } from "@modelcontextprotocol/server";

export const MCP_BODY_LIMIT = 32 * 1024;

export const MCP_HOSTS = [
  "knowyouragent.fun",
  "www.knowyouragent.fun",
  "localhost",
  "127.0.0.1",
  "[::1]",
];

type McpFetch = {
  fetch: (request: Request) => Promise<Response>;
};

export async function serveMcp(handler: McpFetch, request: Request): Promise<Response> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^[0-9]+$/.test(declared) || Number(declared) > MCP_BODY_LIMIT)) {
    return protocolError(413, "The MCP request is larger than 32 KB.");
  }

  const hostRejected = hostGuard(request);
  if (hostRejected) return hostRejected;
  const originRejected = originValidationResponse(request, MCP_HOSTS);
  if (originRejected) return withNoStore(originRejected);

  if (request.method !== "POST") return withNoStore(await handler.fetch(request));

  const limited = await readLimited(request);
  if (!limited.ok) return limited.response;
  const copy = new ArrayBuffer(limited.bytes.byteLength);
  new Uint8Array(copy).set(limited.bytes);
  const replay = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: copy,
  });
  return withNoStore(await handler.fetch(replay));
}

async function readLimited(request: Request): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; response: Response }> {
  if (!request.body) return { ok: true, bytes: new Uint8Array() };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MCP_BODY_LIMIT) {
        await reader.cancel();
        return { ok: false, response: protocolError(413, "The MCP request is larger than 32 KB.") };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, response: protocolError(400, "The MCP request could not be read.") };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

function hostGuard(request: Request): Response | undefined {
  const header = request.headers.get("host") ?? new URL(request.url).host;
  const result = validateHostHeader(header, MCP_HOSTS);
  if (result.ok) return undefined;
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message: "The Host header is not allowed." }, id: null },
    { status: 403, headers: { "cache-control": "no-store" } },
  );
}
function protocolError(status: number, message: string): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32600, message }, id: null },
    { status, headers: { "cache-control": "no-store" } },
  );
}

async function withNoStore(response: Response): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
