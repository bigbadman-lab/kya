import { Fingerprint, KeyRound, Radar } from "lucide-react";
import { SectionFrame } from "@/components/section-frame";

const PILLARS = [
  {
    title: "Identity",
    icon: Fingerprint,
    body: "A persistent public record: name, identifier, claimed endpoint, declared capabilities, and registration state.",
  },
  {
    title: "Verification",
    icon: KeyRound,
    body: "A domain or endpoint control check. It shows control of a claim. It does not show that the agent is safe or telling the truth.",
  },
  {
    title: "Discovery",
    icon: Radar,
    body: "A public registry, and later a machine-readable lookup, so humans and agents can find a record.",
  },
];

export function ProductPillars() {
  return (
    <SectionFrame id="pillars">
      <div className="border-b border-dashed border-zinc-800 px-6 py-16 md:px-8 md:py-24 lg:px-12">
        <p className="text-sm text-zinc-100">- Product</p>
        <h2 className="mt-5 max-w-md text-4xl font-medium leading-tight text-white md:text-[40px]">
          Identity, verification, discovery.
        </h2>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-3">
        {PILLARS.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <li
              key={pillar.title}
              className={`px-6 py-8 md:px-8 lg:px-12 border-dashed border-zinc-800 ${index < 2 ? "border-b md:border-b-0 md:border-r" : ""}`}
            >
              <Icon size={20} strokeWidth={1.75} className="text-zinc-50" aria-hidden="true" />
              <h3 className="mt-4 text-base text-zinc-50">{pillar.title}</h3>
              <p className="mt-3 text-sm/5.5 font-light text-zinc-400">{pillar.body}</p>
            </li>
          );
        })}
      </ul>
    </SectionFrame>
  );
}
