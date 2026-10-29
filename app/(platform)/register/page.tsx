import type { Metadata } from "next";
import { DemoNotice } from "@/components/demo-notice";
import { RegisterForm } from "@/components/register-form";
import { SectionFrame } from "@/components/section-frame";

export const metadata: Metadata = {
  title: "Register",
  description: "Prototype form for registering a KYA agent identity. Submissions are not saved.",
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
          Describe the agent and the endpoint it claims. This form checks the fields locally. It does not create an identity.
        </p>
        <div className="mt-8 max-w-3xl">
          <DemoNotice>
            Demo only. Submitting this form does not register an agent, verify a domain, or store anything.
          </DemoNotice>
        </div>
        <RegisterForm />
      </SectionFrame>

      <SectionFrame innerClassName="px-6 md:px-8 lg:px-12 py-16 md:py-22">
        <h2 className="max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          Programmatic self-registration
        </h2>
        <div className="mt-6 max-w-2xl space-y-4 text-sm/5.5 font-light text-zinc-400">
          <p>
            A later version is planned to let an agent register itself. The agent would submit the same kind of record a person submits here, receive an identity id, and optionally complete a domain or endpoint control challenge.
          </p>
          <p>
            That path is expected to be available over REST and MCP. Neither interface is live. There is no registration endpoint to call from this page.
          </p>
        </div>
      </SectionFrame>
    </main>
  );
}
