"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import Animation from "@/components/animation";
import { USE_CASES_DATA } from "@/data/use-case";
import { motion } from "motion/react";

export function UseCase() {
  const [activeId, setActiveId] = useState<string | null>(USE_CASES_DATA[0].id);
  const [activeImageId, setActiveImageId] = useState(USE_CASES_DATA[0].id);

  const handleToggle = (id: string) => {
    setActiveImageId(id);
    setActiveId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      id="solutions"
      className="w-full border-b border-dashed border-zinc-800 relative bg-black"
    >
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto">
        <div className="w-full relative border-x border-dashed border-zinc-800 py-16 md:py-22 px-6 md:px-8 lg:px-12">
          <div className="mb-12 md:mb-16">
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
              - USE CASES
            </motion.p>
            <motion.h2
              className="text-4xl md:text-[40px] font-medium text-white leading-tight mt-5 max-w-84"
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
              Put your busywork on autopilot.
            </motion.h2>
          </div>

          <div className="w-full rounded-xl border border-zinc-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative bg-black">
            {/* Left Column */}
            <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-dashed border-zinc-800">
              {USE_CASES_DATA.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.id === activeId;

                return (
                  <motion.div
                    key={item.id}
                    className="w-full border-b border-dashed border-zinc-800 transition-colors duration-200 hover:bg-zinc-950/50 last:border-b-0 flex-1 flex flex-col justify-center group"
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
                    <button
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      className="w-full text-left p-6 transition-all duration-200 cursor-pointer outline-none"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${isActive ? "border-zinc-700 bg-zinc-900 text-white" : "border-zinc-800 text-zinc-50 group-hover:text-zinc-200"}`}
                          >
                            <Icon size={16} strokeWidth={1.5} />
                          </div>
                          <span
                            className={`text-base tracking-tight transition-colors duration-200 ${isActive ? "text-white font-medium" : "text-zinc-50 group-hover:text-white"}`}
                          >
                            {item.title}
                          </span>
                        </div>
                        <ChevronRight
                          size={18}
                          strokeWidth={1.75}
                          className={`shrink-0 transition-transform duration-300 ${isActive ? "text-white rotate-90" : "text-zinc-50 rotate-0 group-hover:text-zinc-50"}`}
                        />
                      </div>

                      <div
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                      >
                        <div className="overflow-hidden min-h-0">
                          <p className="text-sm text-zinc-400 font-light leading-relaxed pt-2 pl-11 max-w-sm md:max-w-xl lg:max-w-sm">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Right Column */}
            <div className="lg:col-span-7 xl:col-span-7 relative p-6 md:p-8 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <Animation />
              </div>
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,rgba(0,0,0,0.2)_30%,rgba(0,0,0,0.8)_100%)] z-1" />

              <div className="relative z-10 w-full aspect-1645/956 border border-zinc-900 rounded-md">
                {USE_CASES_DATA.map((item) => {
                  const isCurrent = item.id === activeImageId;
                  return (
                    <Image
                      key={item.id}
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      priority={item.id === USE_CASES_DATA[0].id}
                      className={`absolute inset-0 w-full h-full object-contain rounded-xl transition-all duration-300 ease-in-out ${isCurrent ? "scale-100 z-10 pointer-events-auto" : "opacity-0 scale-[0.985] z-0 pointer-events-none"}`}
                    />
                  );
                })}
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

export default UseCase;
