"use client";

import { useMemo, useState } from "react";
import { AgentCard } from "@/components/agent-card";
import {
  DEMO_AGENTS,
  DEMO_CATEGORIES,
  type DemoCategory,
  type DemoStatus,
} from "@/data/demo-agents";

type StatusFilter = "all" | DemoStatus;

export function RegistryBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DemoCategory | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return DEMO_AGENTS.filter((agent) => {
      if (category !== "all" && agent.category !== category) return false;
      if (status !== "all" && agent.status !== status) return false;
      if (!needle) return true;
      const haystack = [agent.name, agent.description, ...agent.capabilities].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, category, status]);

  return (
    <div>
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => event.preventDefault()}
        role="search"
      >
        <div>
          <label htmlFor="agent-search" className="text-xs text-zinc-400">
            Search samples
          </label>
          <input
            id="agent-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, description, or capability"
            className="mt-2 w-full border border-zinc-800 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500"
          />
        </div>
        <fieldset>
          <legend className="text-xs text-zinc-400">Category</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterButton active={category === "all"} onClick={() => setCategory("all")}>
              All
            </FilterButton>
            {DEMO_CATEGORIES.map((item) => (
              <FilterButton key={item} active={category === item} onClick={() => setCategory(item)}>
                {item}
              </FilterButton>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs text-zinc-400">Status</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterButton active={status === "all"} onClick={() => setStatus("all")}>
              All
            </FilterButton>
            <FilterButton active={status === "registered"} onClick={() => setStatus("registered")}>
              Registered
            </FilterButton>
            <FilterButton active={status === "domain_verified"} onClick={() => setStatus("domain_verified")}>
              Domain verified
            </FilterButton>
          </div>
          <p className="mt-3 max-w-xl text-xs/5 text-zinc-500">
            Registered means the sample has an identity record only. Domain verified means the sample also includes a simulated control check. Domain-verified samples are still registered.
          </p>
        </fieldset>
      </form>

      {results.length === 0 ? (
        <p className="mt-12 border border-dashed border-zinc-800 px-4 py-8 text-sm text-zinc-400">
          No sample agents match that search.
        </p>
      ) : (
        <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((agent) => (
            <li key={agent.id} className="min-w-0">
              <AgentCard agent={agent} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer border px-3 py-1.5 text-xs transition-colors ${active ? "border-white text-white" : "border-zinc-800 text-zinc-400 hover:text-white"}`}
    >
      {children}
    </button>
  );
}
