"use client";

import { HOW_RELAY_WORKS_DATA } from "@/data/how-relay-works";
import { motion } from "motion/react";

export function HowRelayWorks() {
  return (
    <section
      id="product"
      className="w-full border-b border-dashed border-zinc-800 relative bg-black"
    >
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto">
        <div className="w-full relative border-x border-dashed border-zinc-800">
          <div className="w-full relative border-b border-dashed border-zinc-800 py-16 md:py-24 px-4 flex flex-col items-center justify-center text-center">
            <motion.p
              className="text-sm text-zinc-100"
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
              - HOW RELAY WORKS
            </motion.p>
            <motion.h2
              className="text-4xl md:text-[40px] font-medium text-white leading-tight mt-5 max-w-119"
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
              From idea to autonomous workflow in minutes
            </motion.h2>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 relative">
            {HOW_RELAY_WORKS_DATA.map((item, index) => {
              const Icon = item.icon;
              const isLeftColumn = index % 2 === 0;
              const isNotLastRow = index < 4;

              return (
                <motion.div
                  key={item.id}
                  className={`px-6 md:px-8 lg:px-12 py-8 transition-colors duration-200 hover:bg-zinc-950/50 group relative ${
                    isNotLastRow ? "border-b" : "max-md:border-b"
                  } ${isLeftColumn ? "md:border-r" : ""} border-dashed border-zinc-800`}
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: index * 0.08,
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={20}
                      strokeWidth={1.75}
                      className="text-zinc-50 shrink-0"
                    />
                    <h3 className="text-base text-zinc-50 tracking-tight">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm/5.5 text-zinc-400 font-light mt-3.5 max-w-105">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
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

export default HowRelayWorks;
