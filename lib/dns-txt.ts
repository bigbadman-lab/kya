import { Resolver } from "node:dns/promises";

const TIMEOUT_MS = 8000;

export type TxtObservation =
  | { status: "observed"; values: string[] }
  | { status: "missing" }
  | { status: "unavailable" };

export async function observeChallengeTxt(claimedHost: string): Promise<TxtObservation> {
  const name = `_kya-challenge.${claimedHost}`;
  if (name.length > 253 || name.includes("..")) return { status: "unavailable" };

  const resolver = new Resolver();
  try {
    const records = await withTimeout(resolver.resolveTxt(name), TIMEOUT_MS);
    const values = records
      .map((chunks) => chunks.join("").trim())
      .filter((value) => value.length >= 1 && value.length <= 512)
      .slice(0, 20);
    return values.length > 0 ? { status: "observed", values } : { status: "missing" };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ENOTIMP") return { status: "missing" };
    return { status: "unavailable" };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("DNS lookup timed out");
      Object.assign(error, { code: "ETIMEOUT" });
      reject(error);
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
