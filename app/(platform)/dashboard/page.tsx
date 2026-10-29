import type { Metadata } from "next";
import Link from "next/link";
import { ManageAgent } from "@/components/manage-agent";
import { SectionFrame } from "@/components/section-frame";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage a KYA identity with its management token. This page is not a signed-in account.",
};

export default function DashboardPage() {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Dashboard</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Developer dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          Open one identity with its public id and management token. There is no user account behind this page. The token is not read from the URL. Enter it below. It stays in memory for this visit and is not saved in the browser.
        </p>
        <ManageAgent />
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
