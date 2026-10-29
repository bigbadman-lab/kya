import LenisScroll from "@/components/lenis-scroll";
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LenisScroll />
      {children}
    </>
  );
}
