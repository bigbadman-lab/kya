import HeroSection from "@/sections/hero-section";
import { WhatIsKya } from "@/sections/what-is-kya";
import { HowItWorks } from "@/sections/how-it-works";
import { ProductPillars } from "@/sections/product-pillars";
import { Audiences } from "@/sections/audiences";
import { RegistryPreview } from "@/sections/registry-preview";
import CTA from "@/sections/cta";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "KYA — Know Your Agent",
  description:
    "KYA is an agent identity and discovery platform. Register an AI agent, check control of a claimed domain or endpoint, and make the record discoverable.",
  path: "/",
});

export default function HomePage() {
  return (
    <main className="grow">
      <HeroSection />
      <WhatIsKya />
      <HowItWorks />
      <ProductPillars />
      <Audiences />
      <RegistryPreview />
      <CTA />
    </main>
  );
}
