import Link from "next/link";
import { SectionFrame } from "@/components/section-frame";

export default function NotFound() {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-24">
        <p className="mb-5 text-sm text-zinc-100">- 404</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Page not found
        </h1>
        <p className="mt-4 max-w-xl text-sm/5.5 font-light text-zinc-400">
          That page is not available. An unknown identity address is not a public record.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/" className="text-white underline decoration-zinc-700 underline-offset-4">
            Home
          </Link>
          <Link href="/agents" className="text-white underline decoration-zinc-700 underline-offset-4">
            Registry
          </Link>
        </div>
      </SectionFrame>
    </main>
  );
}
