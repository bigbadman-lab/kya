import Link from "next/link";
import { formatCheckIn, networkCursor, networkEventLabel, type NetworkEvent } from "@/lib/presence";

export function NetworkEvents({ events }: { events: NetworkEvent[] }) {
  return (
    <ul className="mt-8 divide-y divide-dashed divide-zinc-800 border-y border-dashed border-zinc-800">
      {events.map((event) => (
        <li key={networkCursor(event)} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <Link href={event.identityUrl} className="text-sm text-white underline decoration-zinc-700 underline-offset-4">
              {event.name}
            </Link>
            <p className="mt-1 text-xs text-zinc-500">{networkEventLabel(event.eventType)}</p>
          </div>
          <time dateTime={event.occurredAt} className="shrink-0 font-mono text-xs text-zinc-400">
            {formatCheckIn(event.occurredAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
