"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkle } from "lucide-react";
import { motion } from "motion/react";
import Animation from "@/components/animation";
import { CornerMarks } from "@/components/corner-marks";
import { TokenMintCopy } from "@/components/token-mint-copy";
import WarpText from "@/components/warp-text";

export function HeroSection({ mint }: { mint?: string | null }) {
  return (
    <motion.section
      className="w-full border-b border-dashed border-zinc-800 relative"
      initial={{ opacity: 0.4 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto h-full">
        <div className="w-full min-h-[calc(100vh-68px)] flex flex-col items-center justify-center border-x border-dashed border-zinc-800 relative py-12 md:py-16">
          <CornerMarks />
          <Animation />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(0,0,0,1)_38%,rgba(0,0,0,0.6)_68%,transparent_100%)] z-1" />

          <motion.div
            className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full border border-zinc-800 relative z-10"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
          >
            <Sparkle size={16} strokeWidth={1.5} className="text-zinc-50" fill="#FAFAFA" />
            <p className="text-xs text-zinc-50 sm:text-sm">THE IDENTITY LAYER FOR AI AGENTS</p>
          </motion.div>

          <motion.div
            className="w-full max-w-178 mt-6 mx-auto max-sm:px-4 relative z-10"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
          >
            <WarpText
              text={"Every agent needs\nan identity."}
              borderedText="an identity."
              borderColor="#27272A"
              color="#f4f4f5"
              fontFamily="var(--font-urbanist), Urbanist, sans-serif"
              fontWeight={500}
              fontSize="clamp(2.25rem, 6.5vw, 5.25rem)"
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

          <motion.p
            className="text-sm/5.5 text-center font-light max-w-122.5 mt-4 mx-auto max-sm:px-4 text-zinc-400 relative z-10"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
          >
            Register your AI agent. Establish a verifiable identity. Make it discoverable across the agent economy.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-4 mt-10 relative z-10"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
          >
            <Link href="/register" className="inline-flex items-center gap-1 bg-white px-5 text-sm font-medium py-2.5 text-zinc-800 rounded-sm group">
              Register an Agent
              <ArrowUpRight size={20} strokeWidth={1.8} className="transition-transform duration-300 ease-out group-hover:rotate-45 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/agents" className="border border-zinc-800 text-white px-5 py-2.5 rounded-sm text-sm group">
              <span className="relative block overflow-hidden">
                <span className="block transition-transform duration-400 group-hover:-translate-y-full">Explore Agents</span>
                <span aria-hidden="true" className="absolute top-0 left-0 block transition-transform duration-400 translate-y-full group-hover:translate-y-0">Explore Agents</span>
              </span>
            </Link>
          </motion.div>
          {mint ? <TokenMintCopy mint={mint} /> : null}
        </div>
      </div>
    </motion.section>
  );
}

export default HeroSection;
