import type { NextRequest } from "next/server";
import { registrationAddress, registerIdentity } from "@/lib/identity-commands";
import { identityRpc } from "@/lib/identity-rpc";
import { jsonNoStore } from "@/lib/http";
import { REGISTRATION_BODY_LIMIT } from "@/lib/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return jsonNoStore({ error: "kya_invalid", message: "Use POST to register an agent." }, 405, { Allow: "POST" });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type");
  if (!isJsonContentType(contentType)) {
    return jsonNoStore({ error: "kya_invalid", message: "Send the registration as application/json." }, 400);
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && (!/^[0-9]+$/.test(declaredLength) || Number(declaredLength) > REGISTRATION_BODY_LIMIT)) {
    return jsonNoStore({ error: "kya_invalid", message: "The registration is larger than 8 KB." }, 400);
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > REGISTRATION_BODY_LIMIT) {
    return jsonNoStore({ error: "kya_invalid", message: "The registration is larger than 8 KB." }, 400);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return jsonNoStore({ error: "kya_invalid", message: "The registration body is not valid JSON." }, 400);
  }

  const address = registrationAddress(
    request.headers.get("x-real-ip"),
    request.nextUrl.hostname,
    process.env.VERCEL === "1",
  );
  const result = await registerIdentity({ body: payload, address }, identityRpc);
  return jsonNoStore(result.body, result.status);
}

function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const [type, ...params] = value.split(";").map((part) => part.trim().toLowerCase());
  if (type !== "application/json") return false;
  return params.every((param) => param === "" || param === "charset=utf-8");
}
