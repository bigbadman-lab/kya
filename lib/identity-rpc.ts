import "server-only";

import { createAdminSupabase } from "@/lib/admin-supabase";
import type { IdentityRpcResult } from "@/lib/identity-commands";

export async function identityRpc(fn: string, args: Record<string, unknown>): Promise<IdentityRpcResult> {
  const supabase = createAdminSupabase();
  if (!supabase) return { error: "kya_unavailable" };

  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { error: error.message };
  return { data };
}
