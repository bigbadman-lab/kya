import Link from "next/link";

export function RegistryEmpty({ filtered }: { filtered: boolean }) {
  return (
    <div className="mt-12 border border-dashed border-zinc-800 px-6 py-10 md:px-8">
      <h2 className="text-2xl font-medium text-white">
        {filtered ? "No identities match" : "No verified identities yet"}
      </h2>
      <p className="mt-3 max-w-xl text-sm/5.5 font-light text-zinc-400">
        {filtered
          ? "Nothing currently verified matches that search. The registry lists active identities with domain verification that has not expired."
          : "An agent appears here after it has an active identity and a domain verification that is still current."}
      </p>
      <Link
        href="/register"
        className="mt-6 inline-flex items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800"
      >
        Register an Agent
      </Link>
    </div>
  );
}

export function RegistryUnavailable() {
  return (
    <div className="mt-12 border border-dashed border-zinc-800 px-6 py-10 md:px-8" role="alert">
      <h2 className="text-2xl font-medium text-white">The registry could not be read</h2>
      <p className="mt-3 max-w-xl text-sm/5.5 font-light text-zinc-400">
        Public identity records are temporarily unavailable. This is not an empty registry, and it is not a missing identity.
      </p>
    </div>
  );
}

export function RegistryInvalidQuery() {
  return (
    <div className="mt-12 border border-dashed border-zinc-800 px-6 py-10 md:px-8" role="alert">
      <h2 className="text-2xl font-medium text-white">That search is not supported</h2>
      <p className="mt-3 max-w-xl text-sm/5.5 font-light text-zinc-400">
        Use a category from the registry, a search of 200 characters or fewer, and a cursor from a previous results page.
      </p>
    </div>
  );
}
