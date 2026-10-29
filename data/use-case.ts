import { CalendarClock, UserCheck, MessageCircle, ChartNoAxesCombined, type LucideIcon } from "lucide-react";

export interface UseCaseItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
}

export const USE_CASES_DATA: UseCaseItem[] = [
  {
    id: "automate-recurring-work",
    icon: CalendarClock,
    title: "Automate recurring work",
    description: "Reports, updates, follow-ups and routine checks happen automatically, right on schedule.",
    image: "/usecase1.png",
  },
  {
    id: "qualify-every-lead",
    icon: UserCheck,
    title: "Qualify every lead",
    description: "Capture, score and enrich inbound leads instantly. Route high-intent prospects straight to sales reps.",
    image: "/usecase2.png",
  },
  {
    id: "handle-support-requests",
    icon: MessageCircle,
    title: "Handle support requests",
    description: "Triage tickets, answer common questions and draft personalized responses with full customer context.",
    image: "/usecase3.png",
  },
  {
    id: "turn-data-into-insights",
    icon: ChartNoAxesCombined,
    title: "Turn data into insights",
    description: "Analyze metrics across tools, share key updates, answer questions and automate reporting.",
    image: "/usecase4.png",
  },
];
