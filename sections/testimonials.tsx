"use client";

import Image from "next/image";
import { TESTIMONIALS_DATA } from "@/data/testimonial";
import { motion } from "motion/react";

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="w-full border-b border-dashed border-zinc-800 relative bg-black"
    >
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto">
        <div className="w-full relative border-x border-dashed border-zinc-800">
          <div className="w-full relative border-b border-dashed border-zinc-800 py-16 md:py-22 px-4 flex flex-col items-center justify-center text-center">
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
              - TESTIMONIALS
            </motion.p>
            <motion.h2
              className="text-4xl md:text-[40px] font-medium text-white leading-tight max-w-105"
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
              What teams are saying about Relay
            </motion.h2>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 relative">
            {TESTIMONIALS_DATA.map((t, idx) => {
              // Responsive dashed border calculations
              const hasBorderBottom =
                idx < 3
                  ? "border-b"
                  : idx < 4
                    ? "max-lg:border-b"
                    : idx < 5
                      ? "max-md:border-b"
                      : "";
              const hasBorderRight = `${idx % 3 !== 2 ? "lg:border-r" : ""} ${
                idx % 2 === 0 ? "md:max-lg:border-r" : ""
              }`;

              return (
                <motion.div
                  key={t.id}
                  className={`px-6 md:px-8 py-6 flex flex-col justify-between border-dashed border-zinc-800 transition-colors duration-200 hover:bg-zinc-950/50 ${hasBorderBottom} ${hasBorderRight}`}
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: idx * 0.08,
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="mb-6">
                    <div className="flex items-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6.524 1.464a.5.5 0 0 1 .952 0l.983 3.027a.5.5 0 0 0 .476.346h3.184a.5.5 0 0 1 .293.904L9.837 7.613a.5.5 0 0 0-.182.559l.984 3.028a.5.5 0 0 1-.77.559L7.295 9.887a.5.5 0 0 0-.588 0L4.13 11.76a.5.5 0 0 1-.769-.56l.984-3.027a.5.5 0 0 0-.182-.56l-2.575-1.87a.5.5 0 0 1 .293-.905h3.184a.5.5 0 0 0 .476-.346z"
                            fill="#00D492"
                          />
                        </svg>
                      ))}
                    </div>

                    <p className="text-sm/6 text-zinc-200 font-light">
                      {t.quote}
                    </p>
                  </div>

                  <div className="pt-5 border-t border-zinc-900 flex items-center gap-2.5">
                    <Image
                      src={t.image}
                      alt={t.name}
                      width={44}
                      height={44}
                      className="size-11 rounded-full object-cover shrink-0 bg-white"
                    />
                    <div className="flex flex-col">
                      <h3 className="text-sm text-white">{t.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{t.role}</p>
                    </div>
                  </div>
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

export default Testimonials;
