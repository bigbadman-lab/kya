"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="w-full border-b border-dashed border-zinc-800 relative">
      <div className="px-4 md:px-16 lg:px-24 xl:px-32 w-full max-w-360 mx-auto">
        <nav className="relative flex items-center justify-between border-x border-dashed border-zinc-800 p-4 md:py-4 md:px-6 w-full ">
          <svg width="10" height="9" viewBox="0 0 10 9" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-full -left-1.25 z-30 pointer-events-none text-zinc-700 fill-zinc-700"><path d="M0 0L10 0L5 9Z" fill="currentColor" /></svg>
          <svg width="10" height="9" viewBox="0 0 10 9" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-full -right-1.5 z-30 pointer-events-none text-zinc-700 fill-zinc-700"><path d="M0 0L10 0L5 9Z" fill="currentColor" /></svg>

          <a href="#" className="flex items-center">
            <Image src="/logo.svg" alt="Relay Logo" width={116} height={40} priority />
          </a>
          <div id="menu" className={`${mobileOpen ? "max-md:w-full" : "max-md:w-0"} max-md:fixed max-md:top-0 max-md:z-50 max-md:left-0 max-md:transition-all max-md:duration-300 max-md:overflow-hidden max-md:h-screen max-md:bg-black/50 max-md:backdrop-blur-md max-md:flex-col max-md:justify-center md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center gap-10 text-sm`}>
            <a href="#product" onClick={() => setMobileOpen(false)} className="text-white hover:text-white/75 transition-colors duration-200" >Product</a>
            <a href="#solutions" onClick={() => setMobileOpen(false)} className="text-white hover:text-white/75 transition-colors duration-200" >Solutions</a>
            <a href="#integrations" onClick={() => setMobileOpen(false)} className="text-white hover:text-white/75 transition-colors duration-200">Integrations</a>
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="text-white hover:text-white/75 transition-colors duration-200" >Pricing</a>

            <button id="close-menu" onClick={() => setMobileOpen(false)} className="md:hidden bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-md aspect-square font-medium transition cursor-pointer" >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" >
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <button className="group hidden md:flex items-center justify-center bg-white text-zinc-800 px-5 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 cursor-pointer overflow-hidden">
            Get Started
            <span className="inline-flex items-center overflow-hidden transition-all duration-300 ease-out max-w-0 group-hover:max-w-5 opacity-0 group-hover:opacity-100 group-hover:ml-1.5">
              <ArrowUpRight strokeWidth={1.8} className="size-5 shrink-0 translate-y-3 -translate-x-1.5 opacity-0 group-hover:translate-y-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ease-out" />
            </span>
          </button>

          <button id="open-menu" onClick={() => setMobileOpen(true)} className="md:hidden bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-md aspect-square font-medium transition cursor-pointer relative" >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h16" /><path d="M4 18h16" /><path d="M4 6h16" />
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;