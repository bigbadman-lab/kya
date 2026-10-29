import type { ReactNode } from "react";
import { CornerMarks } from "@/components/corner-marks";

export function SectionFrame({
  id,
  children,
  className = "",
  innerClassName = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <section id={id} className={`w-full border-b border-dashed border-zinc-800 relative bg-black ${className}`}>
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto">
        <div className={`w-full relative border-x border-dashed border-zinc-800 ${innerClassName}`}>
          {children}
          <CornerMarks />
        </div>
      </div>
    </section>
  );
}
