export interface PricingPlan {
  id: string;
  name: string;
  annualPrice: string;
  monthlyPrice: string;
  description: string;
  features: string[];
  button: string;
  isPopular?: boolean;
  badge?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    annualPrice: "19",
    monthlyPrice: "24",
    description: "For individuals getting started with AI automation.",
    features: [
      "3 AI agents",
      "1,000 runs / month",
      "5 integrations",
      "Basic workflows",
      "Run history",
    ],
    button: "Get Started",
    isPopular: false,
  },
  {
    id: "growth",
    name: "Growth",
    annualPrice: "49",
    monthlyPrice: "59",
    description: "For teams automating everyday workflows.",
    features: [
      "15 AI agents",
      "10,000 runs / month",
      "Unlimited integrations",
      "Advanced workflows",
      "Human approval steps",
    ],
    button: "Start Building",
    isPopular: true,
    badge: "Most Popular",
  },
  {
    id: "scale",
    name: "Scale",
    annualPrice: "99",
    monthlyPrice: "119",
    description: "For teams running automation at scale.",
    features: [
      "Unlimited AI agents",
      "50,000 runs / month",
      "Advanced permissions",
      "Custom workflows",
      "Team workspaces",
    ],
    button: "Get Started",
    isPopular: false,
  },
];
