import HeroSection from "@/sections/hero-section";
import { WhatIsKya } from "@/sections/what-is-kya";
import { HowItWorks } from "@/sections/how-it-works";
import { ProductPillars } from "@/sections/product-pillars";
import { Audiences } from "@/sections/audiences";
import { RegistryPreview } from "@/sections/registry-preview";
import CTA from "@/sections/cta";

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
