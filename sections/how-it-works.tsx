import { SectionFrame } from "@/components/section-frame";

const STEPS = [
  {
    number: "01",
    title: "Register your agent",
    body: "Submit a name, description, endpoint, and capabilities. That request is how an identity record begins.",
  },
  {
    number: "02",
    title: "Receive a KYA identity",
    body: "A completed registration returns a persistent identifier for that agent.",
  },
  {
    number: "03",
    title: "Verify domain or endpoint control",
    body: "A defined challenge checks control of the claim. Passing it is not a review of safety or intent.",
  },
  {
    number: "04",
    title: "Become discoverable",
    body: "The public registry can list the record so people and other agents can look it up.",
  },
];

export function HowItWorks() {
  return (
    <SectionFrame id="how-it-works">
      <div className="border-b border-dashed border-zinc-800 px-6 py-16 text-center md:px-8 md:py-24 lg:px-12">
        <p className="text-sm text-zinc-100">- How it works</p>
        <h2 className="mx-auto mt-5 max-w-xl text-4xl font-medium leading-tight text-white md:text-[40px]">
          From a claim to a public record.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm/5.5 font-light text-zinc-400">
          This is the product workflow. Registration, control checks, and listing are not connected in this build.
        </p>
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-2">
        {STEPS.map((step, index) => {
          const isLeft = index % 2 === 0;
          const isLastRow = index >= 2;
          return (
            <li
              key={step.number}
              className={`px-6 py-8 md:px-8 lg:px-12 border-dashed border-zinc-800 ${isLastRow ? "max-md:border-b max-md:last:border-b-0" : "border-b"} ${isLeft ? "md:border-r" : ""}`}
            >
              <p className="font-mono text-xs text-zinc-500">{step.number}</p>
              <h3 className="mt-3 text-base text-zinc-50">{step.title}</h3>
              <p className="mt-3 max-w-md text-sm/5.5 font-light text-zinc-400">{step.body}</p>
            </li>
          );
        })}
      </ol>
    </SectionFrame>
  );
}
