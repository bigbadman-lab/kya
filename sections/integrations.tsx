"use client";

import { INTEGRATION_LOGOS } from "@/data/integrations";
import { motion } from "motion/react";

export function Integrations() {
  // Distribute logos into 3 rows (5 logos each)
  const row1 = INTEGRATION_LOGOS.slice(0, 5);
  const row2 = INTEGRATION_LOGOS.slice(5, 10);
  const row3 = INTEGRATION_LOGOS.slice(10, 15);

  // Duplicate items for infinite marquee loop
  const row1Logos = [...row1, ...row1, ...row1, ...row1];
  const row2Logos = [...row2, ...row2, ...row2, ...row2];
  const row3Logos = [...row3, ...row3, ...row3, ...row3];

  return (
    <section
      id="integrations"
      className="w-full border-b border-dashed border-zinc-800 relative bg-black"
    >
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto">
        <div className="w-full relative border-x border-dashed border-zinc-800 py-16 md:py-22 px-6 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 flex flex-col items-start">
              <motion.p
                className="text-sm text-zinc-100 mb-5"
                initial={{ y: -20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 320,
                  damping: 70,
                  mass: 1,
                }}
              >
                - INTEGRATIONS
              </motion.p>

              <motion.h2
                className="text-4xl md:text-[40px] font-medium text-white leading-tight mt-1 max-w-115"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 70,
                  mass: 1,
                }}
              >
                Connect Relay to the tools you already use.
              </motion.h2>

              <motion.p
                className="text-sm/5.5 text-zinc-400 font-light mt-4 max-w-sm"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 320,
                  damping: 70,
                  mass: 1,
                }}
              >
                Connect your favorite apps and let your agents move information,
                trigger actions and keep workflows running automatically.
              </motion.p>

              <motion.button
                className="bg-white text-zinc-800 px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-zinc-200 cursor-pointer mt-8"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 70,
                  mass: 1,
                }}
              >
                Explore integrations
              </motion.button>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-6 relative w-full overflow-hidden mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
              <div className="flex flex-col gap-3 py-2">
                <div className="w-full overflow-hidden">
                  <div className="animate-marquee-reverse flex items-center gap-3 whitespace-nowrap">
                    {row1Logos.map((item, index) => (
                      <div
                        key={`row1-${item.id}-${index}`}
                        className="size-16 md:size-20 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        {item.icon}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-full overflow-hidden">
                  <div className="animate-marquee flex items-center gap-3 whitespace-nowrap">
                    {row2Logos.map((item, index) => (
                      <div
                        key={`row2-${item.id}-${index}`}
                        className="size-16 md:size-20 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        {item.icon}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full overflow-hidden">
                  <div className="animate-marquee-reverse flex items-center gap-3 whitespace-nowrap">
                    {row3Logos.map((item, index) => (
                      <div
                        key={`row3-${item.id}-${index}`}
                        className="size-16 md:size-20 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        {item.icon}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <svg
            width="10"
            height="9"
            viewBox="0 0 10 9"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute top-full -left-1.25 z-30 pointer-events-none text-zinc-700 fill-zinc-700"
          >
            <path d="M0 0L10 0L5 9Z" fill="currentColor" />
          </svg>
          <svg
            width="10"
            height="9"
            viewBox="0 0 10 9"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute top-full -right-1.5 z-30 pointer-events-none text-zinc-700 fill-zinc-700"
          >
            <path d="M0 0L10 0L5 9Z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </section>
  );
}

export default Integrations;
