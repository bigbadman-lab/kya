import { ImageResponse } from "next/og";
import { IdentityCardImage } from "@/components/identity-card-image";
import { isPublicId } from "@/lib/credentials";
import { NO_STORE } from "@/lib/http";
import { cardImageAccess } from "@/lib/identity-card";
import { lookupPublicAgent } from "@/lib/identity-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ publicId: string }> };

export async function GET(_request: Request, context: Context) {
  const { publicId } = await context.params;
  if (!isPublicId(publicId)) {
    return new Response("Not found", { status: 404, headers: NO_STORE });
  }
  const lookup = await lookupPublicAgent(publicId);
  const access = cardImageAccess(publicId, lookup);
  if (!access.card) {
    return new Response(access.status === 503 ? "Unavailable" : "Not found", {
      status: access.status,
      headers: NO_STORE,
    });
  }

  try {
    return new ImageResponse(<IdentityCardImage card={access.card} generatedAt={new Date()} />, {
      width: 1200,
      height: 630,
      headers: NO_STORE,
    });
  } catch {
    return new Response("The card could not be rendered.", { status: 500, headers: NO_STORE });
  }
}
