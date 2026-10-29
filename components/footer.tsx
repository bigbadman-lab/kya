"use client";

import Image from "next/image";
import { FOOTER_NAV, FOOTER_LEGAL } from "@/data/footer";
import { motion } from "motion/react";

export function Footer() {
  return (
    <footer id="footer" className="w-full relative bg-black">
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto">
        <div className="w-full relative border-x border-dashed border-zinc-800">

          <div className="w-full px-6 md:px-8 lg:px-12 pt-16 md:pt-20 pb-16 md:pb-20 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 lg:gap-16">

            <div>
              <motion.a href="#" className="inline-block"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 320, damping: 70, mass: 1 }}
              >
                <Image src="/logo.svg" alt="Relay Logo" width={116} height={40} />
              </motion.a>
              <motion.p className="text-sm/5.5 text-zinc-400 mt-4 max-w-xs md:max-w-90"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
              >
                AI agents for the work that matters. Automate repetitive workflows and give your team more time to focus on what matters.
              </motion.p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-14 lg:gap-20">
              {FOOTER_NAV.map((section) => (
                <div key={section.title} className="flex flex-col">
                  <h3 className="text-sm text-white mb-4">
                    {section.title}
                  </h3>
                  <ul className="flex flex-col gap-2 z-10">
                    {section.links.map((link) => (
                      <motion.li key={link.label}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 70, mass: 1 }}
                      >
                        <motion.a href={link.href} className="text-xs text-zinc-400 hover:text-white transition-colors duration-200">
                          {link.label}
                        </motion.a>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

          </div>

          <div className="w-full border-t border-dashed border-zinc-800 px-6 md:px-8 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-400">
              Copyright {new Date().getFullYear()} © PrebuiltUI All Right Reserved.
            </p>

            <div className="flex items-center gap-6 text-xs text-zinc-400">
              {FOOTER_LEGAL.map((item) => (
                <a key={item.label} href={item.href} className="hover:text-white transition-colors duration-200">
                  {item.label}
                </a>
              ))}
            </div>
            <Image src="/footer-watermark.svg" alt="" width={587} height={209} className="absolute bottom-8 right-0 w-xl md:w-206.75 h-52.25 pointer-events-none" />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
