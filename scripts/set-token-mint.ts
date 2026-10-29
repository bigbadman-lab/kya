import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { solanaAddress } from "../lib/solana-address.ts";

const usage = "Usage: pnpm token:set <solana-mint-address>";

function envValue(name: string): string {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of file.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0 || trimmed.slice(0, separator) !== name) continue;
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return "";
}

const address = solanaAddress(process.argv[2] ?? "");
if (!address) {
  console.error(usage);
  console.error("The homepage reads the saved address on the next request. No deploy is required.");
  process.exit(1);
}

const url = envValue("NEXT_PUBLIC_SUPABASE_URL");
const key = envValue("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("The Supabase URL and service role key are required in the environment.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const { error } = await supabase.rpc("set_official_token", { p_mint: address });
if (error) {
  console.error("Could not save the official token address.");
  process.exit(1);
}

console.log(`Official token address saved. The homepage will show ${address} on the next request.`);
