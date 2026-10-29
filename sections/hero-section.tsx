"use client";

import { ArrowUpRight, Sparkle } from "lucide-react";
import Animation from "@/components/animation";
import WarpText from "@/components/warp-text";
import { motion } from "motion/react";

export function HeroSection() {
  return (
    <motion.section className="w-full border-b border-dashed border-zinc-800 relative"
      initial={{ opacity: 0.4 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto h-full">
        <div className="w-full min-h-[calc(100vh-68px)] flex flex-col items-center justify-center border-x border-dashed border-zinc-800 relative py-12 md:py-16">

          <svg width="10" height="9" viewBox="0 0 10 9" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-full -left-1.25 z-30 pointer-events-none text-zinc-700 fill-zinc-700"><path d="M0 0L10 0L5 9Z" fill="currentColor" /></svg>
          <svg width="10" height="9" viewBox="0 0 10 9" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-full -right-1.5 z-30 pointer-events-none text-zinc-700 fill-zinc-700"><path d="M0 0L10 0L5 9Z" fill="currentColor" /></svg>
          <Animation />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(0,0,0,1)_38%,rgba(0,0,0,0.6)_68%,transparent_100%)] z-1" />

          <motion.div className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full border border-zinc-800 hover:border-zinc-900 relative z-10"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
          >
            <Sparkle size={16} strokeWidth={1.5} className="text-zinc-50" fill="#FAFAFA" />
            <p className="text-sm text-zinc-50">Autonomous work, powered by AI</p>
          </motion.div>

          <motion.div
            className="w-full max-w-178 mt-6 mx-auto max-sm:px-4 relative z-10"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
          >
            <WarpText
              text={"Build AI agents that\nwork for you."}
              borderedText="work for you."
              borderColor="#27272A"
              color="#f4f4f5"
              warpStrength={0.08}
              warpScale={1.7}
              speed={0.55}
              pointerInfluence={0.42}
              pointerStrength={0.38}
              refraction={0.018}
              ripple
              className="w-full"
            />
          </motion.div>

          <motion.p className="text-sm/5.5 text-center font-light max-w-122.5 mt-4 mx-auto max-sm:px-4 text-zinc-400 relative z-10"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
          >
            Deploy intelligent agents that automate workflows, connect your tools and get work done while your team focuses on what matters.
          </motion.p>

          <motion.div className='flex gap-5 mt-10 relative z-10'
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
          >
            <button className="flex items-center gap-1 bg-white px-5 text-sm font-medium py-2.5 text-zinc-800 rounded-sm cursor-pointer group">
              Start Building
              <ArrowUpRight size={20} strokeWidth={1.8} className="transition-transform duration-300 ease-out group-hover:rotate-45 group-hover:translate-x-0.5" />
            </button>
            <button className="border border-zinc-800 text-white px-5 py-2.5 rounded-sm text-sm cursor-pointer group">
              <div className="relative overflow-hidden">
                <p className="block transition-transform duration-400 group-hover:-translate-y-full">
                  Explore Agents
                </p>
                <p className="absolute top-0 left-0 block transition-transform duration-400 group-hover:translate-y-0 translate-y-full">
                  Explore Agents
                </p>
              </div>
            </button>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

export default HeroSection;