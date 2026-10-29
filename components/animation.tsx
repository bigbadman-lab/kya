"use client";

import { motion } from "motion/react";

const TOTAL_LINES = 36;

export function HeroLines() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex justify-center"
      style={{
        maskImage:
          "radial-gradient(ellipse 65% 55% at 50% 48%, transparent 35%, black 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 65% 55% at 50% 48%, transparent 35%, black 75%)",
      }}
    >
      <div className="flex justify-center gap-8.5 h-full w-full">
        {Array.from({ length: TOTAL_LINES }).map((_, i) => {
          const leftDelay = (i / TOTAL_LINES) * 3;
          const rightDelay = ((TOTAL_LINES - 1 - i) / TOTAL_LINES) * 3;

          return (
            <motion.div key={i} className="relative w-px h-full origin-top shrink-0" initial={{ opacity: 0.15 }}
              animate={{
                opacity: [0.12, 0.75, 0.12],
              }}
              transition={{ duration: 3, repeat: Infinity, delay: leftDelay, ease: "easeInOut", }}
            >
              <div className="w-full h-full bg-linear-to-b from-emerald-400 via-emerald-400/20 to-emerald-400" />

              <motion.div className="absolute top-0 left-[-0.5px] w-px h-36 bg-linear-to-b from-emerald-400 via-emerald-500 to-transparent rounded-full"
                initial={{ opacity: 0.1, y: 0 }}
                animate={{
                  opacity: [0.1, 0.95, 0.1],
                  y: [0, 30, 0],
                }}
                transition={{ duration: 3, repeat: Infinity, delay: leftDelay, ease: "easeInOut", }}
              />

              <motion.div className="absolute bottom-0 left-[-0.5px] w-px h-36 bg-linear-to-t from-emerald-400 via-emerald-500 to-transparent rounded-full"
                initial={{ opacity: 0.1, y: 0 }}
                animate={{
                  opacity: [0.1, 0.95, 0.1],
                  y: [0, -30, 0],
                }}
                transition={{ duration: 3, repeat: Infinity, delay: rightDelay, ease: "easeInOut", }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default HeroLines;
