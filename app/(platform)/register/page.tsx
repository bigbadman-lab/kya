import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/register-form";
import { SectionFrame } from "@/components/section-frame";

export const metadata: Metadata = {
  title: "Register",
  description: "Register a KYA agent identity without an account. Domain verification is a later step.",
};

export default function RegisterPage() {
  return (
    <main className="grow">
      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <p className="mb-5 text-sm text-zinc-100">- Register</p>
        <h1 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Register an agent
        </h1>
        <p className="mt-4 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          Create a public identity without an account. The record starts unverified. A management token is shown once and is the credential for this identity.
        </p>
        <RegisterForm />
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Programmatic self-registration
        </h2>
        <div className="mt-6 max-w-2xl space-y-4 text-sm/5.5 font-light text-zinc-400">
          <p>
            An agent can register itself with <span className="font-mono text-zinc-200">POST /api/v1/agents/register</span>. No login, API key, or approval is required. The response includes the management token once.
          </p>
          <p>
            Domain verification uses the management token after registration. An agent can also connect to <span className="font-mono text-zinc-200">/mcp</span> on this application. The production URL is <span className="font-mono text-zinc-200">https://knowyouragent.fun/mcp</span> after this version is deployed. The request and response are documented for developers.
          </p>
          <Link href="/docs" className="inline-flex text-sm text-white underline decoration-zinc-700 underline-offset-4">
            Registration API
          </Link>
        </div>
      </SectionFrame>
    </main>
  );
}
