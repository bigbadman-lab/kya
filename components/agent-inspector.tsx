import { INSPECTION_LABEL, type PublicInspection } from "@/lib/inspector";

export function AgentInspector({ report }: { report: PublicInspection }) {
  return (
    <section>
      <h2 className="text-2xl font-medium text-white">Agent Inspector</h2>
      <p className="mt-3 text-sm text-zinc-200">{INSPECTION_LABEL}</p>
      <p className="mt-3 max-w-2xl text-sm/5.5 font-light text-zinc-400">
        Registered means the KYA record exists. Domain verified means a DNS check succeeded. AI inspected means this self-reported profile was interpreted. Those are separate facts.
      </p>
      {report.status === "unavailable" ? (
        <p className="mt-6 text-sm/5.5 font-light text-zinc-400">The interpretation could not be read.</p>
      ) : null}
      {report.status === "none" ? (
        <p className="mt-6 max-w-2xl text-sm/5.5 font-light text-zinc-400">
          This profile has not been interpreted. Inspection is requested by the operator from the dashboard. Opening this page does not run it.
        </p>
      ) : null}
      {report.status === "current" || report.status === "stale" ? <Report report={report} /> : null}
    </section>
  );
}

function Report({ report }: { report: Extract<PublicInspection, { status: "current" | "stale" }> }) {
  return (
    <div className="mt-8 max-w-3xl">
      {report.status === "stale" ? (
        <p className="border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-200">
          This interpretation does not match the current profile. It was generated before a change to the name, description, category, capabilities, hostname, endpoint, or agent card URL.
        </p>
      ) : (
        <p className="text-sm text-zinc-400">Current for this profile. Generated {formatGenerated(report.createdAt)}.</p>
      )}
      {report.status === "stale" ? (
        <p className="mt-3 text-sm text-zinc-500">Generated {formatGenerated(report.createdAt)} from the profile as it was then.</p>
      ) : null}
      <h3 className="mt-8 text-base text-zinc-50">Summary</h3>
      <p className="mt-2 text-sm/5.5 font-light text-zinc-300">{report.summary}</p>
      <h3 className="mt-8 text-base text-zinc-50">Declared capabilities</h3>
      <p className="mt-2 text-sm/5.5 font-light text-zinc-300">{report.capabilitiesInterpretation}</p>
      <h3 className="mt-8 text-base text-zinc-50">Potential use cases</h3>
      <ul className="mt-2 space-y-2 text-sm/5.5 font-light text-zinc-300">
        {report.useCases.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h3 className="mt-8 text-base text-zinc-50">Missing or unspecified details</h3>
      <p className="mt-2 text-sm/5.5 font-light text-zinc-300">{report.limitations}</p>
      <p className="mt-8 text-sm/5.5 font-light text-zinc-500">{report.evidence}</p>
    </div>
  );
}

function formatGenerated(value: string): string {
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}
