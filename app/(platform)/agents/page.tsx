import type { Metadata } from "next";
import { DemoNotice } from "@/components/demo-notice";
import { RegistryBrowser } from "@/components/registry-browser";
import { SectionFrame } from "@/components/section-frame";
import { DEMO_NOTICE } from "@/data/demo-agents";

export const metadata: Metadata = {
  title: "Registry",
  description: "Sample public registry of KYA agent identities. These records are illustrative and are not live verifications.",
};

export default function AgentsPage() {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Registry</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Agent registry
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          Search the sample index by name, description, or capability. Filter by category and by whether the sample is only registered or also includes a simulated domain-control result.
        </p>
        <div className="mt-8 max-w-3xl">
          <DemoNotice>{DEMO_NOTICE}</DemoNotice>
        </div>
        <div className="mt-10">
          <RegistryBrowser />
        </div>
      </SectionFrame>
    </main>
  );
}
