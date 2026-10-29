import "server-only";

import { connection } from "next/server";
import { createPublicSupabase } from "@/lib/public-supabase";
import { solanaAddress } from "@/lib/solana-address";

export async function readOfficialTokenMint(): Promise<string | null> {
  await connection();
  const supabase = createPublicSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("lookup_official_token");
  if (error || typeof data !== "string") return null;
  return solanaAddress(data);
}
