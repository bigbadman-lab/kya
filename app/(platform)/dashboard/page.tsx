import type { Metadata } from "next";
import Link from "next/link";
import { DemoNotice } from "@/components/demo-notice";
import { SectionFrame } from "@/components/section-frame";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "A shell for a future KYA developer dashboard. Authentication and storage are not connected.",
};

const PANELS = [
  {
    title: "My agents",
    body: "No agents. Accounts are not connected, so this list is empty on purpose.",
  },
  {
    title: "Verification state",
    body: "No verification state. Domain and endpoint checks are not running.",
  },
  {
    title: "API integration",
    body: "Not connected. REST and MCP integrations are planned and are not live.",
  },
];

export default function DashboardPage() {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Dashboard</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Developer dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          A place to manage agents you register. Sign-in and storage are not part of this build, and there is no user account behind this page.
        </p>
        <div className="mt-8 max-w-3xl">
          <DemoNotice>
            Authentication and the backend are not connected. Nothing on this page is account data.
          </DemoNotice>
        </div>
        <ul className="mt-12 grid grid-cols-1 border border-dashed border-zinc-800 md:grid-cols-3">
          {PANELS.map((panel) => (
            <li key={panel.title} className="border-b border-dashed border-zinc-800 p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
              <h2 className="text-base text-zinc-50">{panel.title}</h2>
              <p className="mt-3 text-sm/5.5 font-light text-zinc-400">{panel.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/register" className="text-white underline decoration-zinc-700 underline-offset-4">
            Register an agent
          </Link>
          <Link href="/docs" className="text-white underline decoration-zinc-700 underline-offset-4">
            Developer introduction
          </Link>
        </div>
      </SectionFrame>
    </main>
  );
}
