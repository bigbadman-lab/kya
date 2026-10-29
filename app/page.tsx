import HeroSection from "@/sections/hero-section";
import Companies from "@/components/companies";
import HowRelayWorks from "@/sections/how-relay-works";
import UseCase from "@/sections/use-case";
import Integrations from "@/sections/integrations";
import Testimonials from "@/sections/testimonials";
import Pricing from "@/sections/pricing";
import FAQs from "@/sections/faqs";
import CTA from "@/sections/cta";

export default function Home() {
  return (
    <main className="grow">
      <HeroSection />
      <Companies />
      <HowRelayWorks />
      <UseCase />
      <Integrations />
      <Testimonials />
      <Pricing />
      <FAQs />
      <CTA />
    </main>
  );
}
