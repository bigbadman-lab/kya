import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { X_URL, XIcon } from "@/components/x-icon";

const LINKS = [
  { href: "/identity", label: "Identity" },
  { href: "/verify", label: "Verification" },
  { href: "/agents", label: "Registry" },
  { href: "/developers", label: "Developers" },
  { href: "/docs", label: "Documentation" },
  { href: "/about", label: "About" },
  { href: "/register", label: "Register Agent" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Footer() {
  return (
    <footer id="footer" className="w-full relative bg-black">
      <div className="w-full max-w-360 px-4 md:px-16 lg:px-24 xl:px-32 mx-auto">
        <div className="w-full relative border-x border-dashed border-zinc-800">
          <div className="w-full px-6 md:px-8 lg:px-12 pt-16 md:pt-20 pb-12 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-10">
            <div>
              <Link href="/" className="inline-block">
                <BrandLogo height={40} />
              </Link>
              <p className="text-sm/5.5 text-zinc-400 mt-4 max-w-xs">
                Identity and discovery for the agent economy.
              </p>
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <XIcon size={14} />
                @KYAgents
              </a>
            </div>
            <nav aria-label="Footer">
              <ul className="flex flex-col gap-2">
                {LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs text-zinc-400 hover:text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="w-full border-t border-dashed border-zinc-800 px-6 md:px-8 lg:px-12 py-5">
            <p className="text-xs text-zinc-400">© 2026 KYA. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
