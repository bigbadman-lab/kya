import assert from "node:assert/strict";
import { test } from "node:test";
import { solanaAddress } from "../lib/solana-address.ts";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

test("accepts a 32-byte Solana address", () => {
  assert.equal(solanaAddress(`  ${USDC}  `), USDC);
  assert.equal(solanaAddress("1".repeat(32)), "1".repeat(32));
});

test("rejects addresses that are not 32-byte base58", () => {
  assert.equal(solanaAddress(""), null);
  assert.equal(solanaAddress("1".repeat(31)), null);
  assert.equal(solanaAddress("1".repeat(33)), null);
  assert.equal(solanaAddress(`${USDC}0`), null);
  assert.equal(solanaAddress(USDC.replace("E", "O")), null);
  assert.equal(solanaAddress(USDC.replace("E", "I")), null);
  assert.equal(solanaAddress(USDC.replace("E", "l")), null);
});
