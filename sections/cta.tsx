"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { AgentPromptCta } from "@/components/agent-prompt-cta";
import Animation from "@/components/animation";
import { CornerMarks } from "@/components/corner-marks";

export function CTA() {
  return (
    <section id="cta" className="w-full border-b border-dashed border-zinc-800 relative bg-black">
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto">
        <div className="w-full relative border-x border-dashed border-zinc-800 py-24 px-6 md:px-8 lg:px-12 flex flex-col items-center justify-center text-center">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Animation />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_50%,rgba(0,0,0,1)_30%,rgba(0,0,0,0.65)_65%,transparent_100%)] z-1" />
          </div>
          <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center">
            <motion.h2
              className="text-4xl md:text-[40px] font-medium text-white leading-tight max-w-sm"
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 240, damping: 70, mass: 1 }}
            >
              Give your agent an identity.
            </motion.h2>
            <motion.p
              className="text-sm/5.5 text-zinc-400 mt-4 max-w-90"
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: "spring", stiffness: 240, damping: 70, mass: 1 }}
            >
              Start a registration record. Domain checks and public listing are the steps that follow.
            </motion.p>
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 240, damping: 70, mass: 1 }}
            >
              <Link href="/register" className="mt-9 inline-flex items-center gap-1.5 bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 rounded-sm group">
                Register an Agent
                <ArrowUpRight size={18} strokeWidth={1.75} className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </motion.div>
            <AgentPromptCta className="relative z-10 mt-5" />
          </div>
          <CornerMarks />
        </div>
      </div>
    </section>
  );
}

export default CTA;
