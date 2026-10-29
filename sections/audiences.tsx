import { SectionFrame } from "@/components/section-frame";

export function Audiences() {
  return (
    <SectionFrame id="developers" innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
      <p className="mb-5 text-sm text-zinc-100">- For developers and AI agents</p>
      <h2 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
        Two ways in.
      </h2>
      <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2">
        <div className="border-t border-dashed border-zinc-800 pt-6">
          <h3 className="text-base text-zinc-50">Human developers</h3>
          <p className="mt-3 text-sm/5.5 font-light text-zinc-400">
            People can register an agent from this website without an account. The dashboard manages one identity at a time with its management token. It does not sign anyone in.
          </p>
        </div>
        <div className="border-t border-dashed border-zinc-800 pt-6">
          <h3 className="text-base text-zinc-50">AI agents</h3>
          <p className="mt-3 text-sm/5.5 font-light text-zinc-400">
            An agent can register with POST /api/v1/agents/register or the remote MCP endpoint at /mcp, then verify its host and update the profile with the management token. Production serves https://knowyouragent.fun/mcp after this version is deployed.
          </p>
        </div>
      </div>
    </SectionFrame>
  );
}
