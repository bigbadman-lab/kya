"use client";

import { useState } from "react";
import { PRICING_PLANS } from "@/data/pricing";
import { motion } from "motion/react";
import CountNumber from "@/components/count-number";

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section
      id="pricing"
      className="w-full border-b border-dashed border-zinc-800 relative bg-black"
    >
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto">
        <div className="w-full relative border-x border-dashed border-zinc-800 pt-16 md:pt-22 pb-0 px-6 md:px-8 lg:px-12">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-16 md:mb-24">
            <div>
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
                - PRICING
              </motion.p>

              <motion.h2
                className="text-4xl md:text-[40px] font-medium text-white leading-tight max-w-md"
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
                Simple pricing for every stage of automation.
              </motion.h2>

              <motion.div
                className="flex items-center gap-1 mt-6 md:mt-8"
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
                <button
                  type="button"
                  onClick={() => setIsAnnual(true)}
                  className={`text-sm pl-4 pr-2 py-2 rounded-full cursor-pointer transition-colors ${isAnnual ? "text-white border border-zinc-800" : "text-white/60 border border-transparent"}`}
                >
                  Annually{" "}
                  <span className="bg-zinc-800 text-white text-xs px-2 py-1 rounded-full ml-2">
                    SAVE 20%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnnual(false)}
                  className={`text-sm px-3 py-2 rounded-full cursor-pointer transition-colors ${!isAnnual ? "text-white border border-zinc-800" : "text-zinc-400 border border-transparent"}`}
                >
                  Monthly
                </button>
              </motion.div>
            </div>

            <div className="max-w-xs">
              <motion.p
                className="text-sm text-zinc-400 mb-4"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 240,
                  damping: 70,
                  mass: 1,
                }}
              >
                Start with the essentials and scale your automation as your team
                grows.
              </motion.p>
              <motion.div
                className="flex items-center gap-2"
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
                <div className="size-6 rounded-sm border border-zinc-800 flex items-center justify-center shrink-0">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16.667 5 7.5 14.167 3.333 10"
                      stroke="#fff"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm text-zinc-400">
                  14-day free trial on every plan
                </span>
              </motion.div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="w-full max-lg:-mx-2 md:max-lg:-mx-5 lg:max-w-5xl grid grid-cols-1 md:grid-cols-3 items-stretch justify-center lg:mx-auto">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`px-5 py-6 sm:px-6 md:px-4 lg:px-8 hover:bg-zinc-950/60 flex flex-col justify-between ${plan.isPopular ? "border border-dashed border-zinc-800 border-b-0" : "max-md:border max-md:border-dashed max-md:border-zinc-800 max-md:border-b-0"}`}
              >
                <div>
                  {plan.isPopular ? (
                    <div className="flex items-center justify-between mb-6.5">
                      <motion.h3
                        className="text-base font-medium text-white"
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
                        {plan.name}
                      </motion.h3>
                      <button
                        type="button"
                        className="bg-emerald-400 text-white text-xs px-2 py-1 rounded-sm"
                      >
                        {plan.badge || "Most Popular"}
                      </button>
                    </div>
                  ) : (
                    <motion.h3
                      className="text-base font-medium text-white mb-6"
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
                      {plan.name}
                    </motion.h3>
                  )}

                  <motion.div
                    className="mb-2"
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
                    <span className="text-2xl font-medium text-zinc-50">
                      <CountNumber
                        value={Number(
                          isAnnual ? plan.annualPrice : plan.monthlyPrice,
                        )}
                        prefix="$"
                      />
                    </span>
                    <span className="text-xs font-medium text-zinc-50">
                      /month
                    </span>
                  </motion.div>

                  <motion.p
                    className="text-sm text-zinc-200 mb-5 max-w-60 max-lg:max-w-none"
                    initial={{ y: 50, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 0.2,
                      type: "spring",
                      stiffness: 240,
                      damping: 70,
                      mass: 1,
                    }}
                  >
                    {plan.description}
                  </motion.p>

                  <div className="border-t border-zinc-800 pt-5 flex flex-col gap-2 mb-10">
                    {plan.features.map((feature, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-2"
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
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M16.667 5 7.5 14.167 3.333 10"
                            stroke="#fff"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-sm text-white">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <motion.button
                  type="button"
                  className={`${plan.isPopular ? "bg-white text-black font-medium hover:bg-zinc-200" : "border border-zinc-800 text-white hover:bg-zinc-950"} text-sm py-2.5 rounded-sm cursor-pointer`}
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
                  {plan.button}
                </motion.button>
              </div>
            ))}
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

export default Pricing;
