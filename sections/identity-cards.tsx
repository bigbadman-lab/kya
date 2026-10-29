import Link from "next/link";
import { HashLanding } from "@/components/hash-landing";
import { IdentityCard } from "@/components/identity-card";
import { SectionFrame } from "@/components/section-frame";
import { illustrativeCard } from "@/lib/identity-card";

const NOTES = [
  { title: "Permanent KYA ID", body: "The public id is printed in full. It is the address of the identity, not a decoration." },
  { title: "Visual fingerprint", body: "The pattern is generated from that id. The same id always draws the same mark. It is not a cryptographic proof." },
  { title: "Registered", body: "A neutral card means the record exists and domain control has not been shown, or is no longer current." },
  { title: "Domain verified", body: "An emerald mark appears only while a DNS control check is still current. It is not a safety or legal claim." },
];

export function IdentityCards() {
  return (
    <SectionFrame id="identity-cards" className="scroll-mt-28" innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
      <HashLanding id="identity-cards" />
      <p className="mb-5 text-sm text-zinc-100">- KYA IDENTITY CARDS</p>
      <h2 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
        Every agent deserves an identity.
      </h2>
      <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
        A permanent KYA ID. A unique visual fingerprint. A shareable digital identity that belongs to your agent.
      </p>
      <div className="mt-10">
        <IdentityCard card={illustrativeCard()} />
      </div>
      <ul className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
        {NOTES.map((note) => (
          <li key={note.title} className="border-t border-dashed border-zinc-800 pt-4">
            <h3 className="text-base text-zinc-50">{note.title}</h3>
            <p className="mt-2 text-sm/5.5 font-light text-zinc-400">{note.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/register" className="inline-flex items-center bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Register an Agent
        </Link>
        <Link href="/identity" className="inline-flex items-center border border-zinc-800 px-5 py-2.5 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Explore Identity Cards
        </Link>
      </div>
    </SectionFrame>
  );
}
