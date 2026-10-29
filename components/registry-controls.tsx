import Link from "next/link";
import { AGENT_CATEGORIES, type AgentCategory } from "@/lib/identity";
import { registryHref, type RegistryQuery } from "@/lib/identity-read";

export function RegistryControls({ query }: { query: RegistryQuery }) {
  return (
    <form action="/agents" method="get" className="flex flex-col gap-6" role="search">
      {query.category ? <input type="hidden" name="category" value={query.category} /> : null}
      <div>
        <label htmlFor="agent-search" className="text-xs text-zinc-400">
          Search identities
        </label>
        <input
          id="agent-search"
          name="q"
          defaultValue={query.q}
          placeholder="Name, description, or capability"
          maxLength={200}
          className="mt-2 w-full border border-zinc-800 bg-black px-3 py-2.5 text-base text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500"
        />
      </div>
      <fieldset>
        <legend className="text-xs text-zinc-400">Category</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <CategoryLink query={query} category={null} label="All" />
          {AGENT_CATEGORIES.map((category) => (
            <CategoryLink key={category} query={query} category={category} label={category} />
          ))}
        </div>
      </fieldset>
      <p className="max-w-xl text-xs/5 text-zinc-500">
        The registry lists active identities whose domain verification is still current. Registered identities without that verification can be opened by their public address. They are not included here. Domain verification is control of a claimed host. It is not a judgment that an agent is safe or trustworthy.
      </p>
      <button
        type="submit"
        className="w-fit cursor-pointer border border-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:border-zinc-600"
      >
        Search
      </button>
    </form>
  );
}

function CategoryLink({
  query,
  category,
  label,
}: {
  query: RegistryQuery;
  category: AgentCategory | null;
  label: string;
}) {
  const active = query.category === category;
  return (
    <Link
      href={registryHref({ ...query, category, cursor: null })}
      aria-current={active ? "true" : undefined}
      className={`border px-3 py-1.5 text-xs transition-colors ${active ? "border-white text-white" : "border-zinc-800 text-zinc-400 hover:text-white"}`}
    >
      {label}
    </Link>
  );
}
