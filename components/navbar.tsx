"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { CornerMarks } from "@/components/corner-marks";
import { X_URL, XIcon } from "@/components/x-icon";

const LINKS = [
  { href: "/agents", label: "Agents" },
  { href: "/developers", label: "Developers" },
  { href: "/about", label: "About" },
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="w-full border-b border-dashed border-zinc-800 relative">
      <div className="px-4 md:px-16 lg:px-24 xl:px-32 w-full max-w-360 mx-auto">
        <nav className="relative flex items-center justify-between border-x border-dashed border-zinc-800 p-4 md:py-4 md:px-6 w-full" aria-label="Primary">
          <CornerMarks />

          <Link href="/" className="flex items-center shrink-0">
            <BrandLogo priority height={26} />
          </Link>

          <div
            id="menu"
            className={`${mobileOpen ? "max-md:w-full" : "max-md:w-0"} max-md:fixed max-md:top-0 max-md:z-50 max-md:left-0 max-md:transition-all max-md:duration-300 motion-reduce:transition-none max-md:overflow-hidden max-md:h-screen max-md:bg-black max-md:flex-col max-md:items-center max-md:justify-center md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center gap-8 text-sm`}
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
                className={`transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${isCurrent(pathname, link.href) ? "text-white" : "text-zinc-400 hover:text-white"}`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="md:hidden inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <XIcon size={16} />
              X
            </a>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === "/register" ? "page" : undefined}
              className="md:hidden inline-flex items-center gap-1 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Register Agent
              <ArrowUpRight size={18} strokeWidth={1.8} />
            </Link>
            <button
              type="button"
              id="close-menu"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="md:hidden bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-md aspect-square font-medium transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="KYA on X"
              className="inline-flex items-center justify-center text-zinc-400 hover:text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <XIcon size={16} />
            </a>
            <Link
              href="/register"
              aria-current={pathname === "/register" ? "page" : undefined}
              className="group hidden md:inline-flex items-center justify-center bg-white text-zinc-800 px-5 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Register Agent
              <span className="inline-flex items-center overflow-hidden transition-all duration-300 ease-out max-w-0 group-hover:max-w-5 opacity-0 group-hover:opacity-100 group-hover:ml-1.5">
                <ArrowUpRight strokeWidth={1.8} className="size-5 shrink-0 translate-y-3 -translate-x-1.5 opacity-0 group-hover:translate-y-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ease-out" />
              </span>
            </Link>
            <button
              type="button"
              id="open-menu"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="menu"
              onClick={() => setMobileOpen(true)}
              className="md:hidden bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-md aspect-square font-medium transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12h16" />
                <path d="M4 18h16" />
                <path d="M4 6h16" />
              </svg>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
