import type { NextRequest } from "next/server";
import { lifecycleAction } from "@/lib/lifecycle-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ publicId: string }> };

export function POST(request: NextRequest, context: Context) {
  return lifecycleAction(request, context, "suspend");
}
