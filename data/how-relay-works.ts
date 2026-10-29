import {
  PlugZap,
  ShieldCheck,
  Activity,
  type LucideIcon,
  Bot,
  Workflow,
  Network,
} from "lucide-react";

export interface HowRelayWorksStep {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export const HOW_RELAY_WORKS_DATA: HowRelayWorksStep[] = [
  {
    id: "define-agent",
    icon: Bot,
    title: "Define Your Agent",
    description:
      "Tell Relay what you want your agent to accomplish. Give it a goal, instructions and the context it needs to get started.",
  },
  {
    id: "connect-tools",
    icon: PlugZap,
    title: "Connect Your Tools",
    description:
      "Connect the apps your team already uses, from Slack and Gmail to Notion, HubSpot, GitHub and more.",
  },
  {
    id: "build-workflow",
    icon: Workflow,
    title: "Build Your Workflow",
    description:
      "Turn simple instructions into repeatable workflows with triggers, actions, conditions and AI-powered decisions.",
  },
  {
    id: "keep-humans-in-control",
    icon: ShieldCheck,
    title: "Keep Humans In Control",
    description:
      "Add approval steps and manual checkpoints whenever a workflow needs human judgment or oversight.",
  },
  {
    id: "let-agents-work-together",
    icon: Network,
    title: "Let Agents Work Together",
    description:
      "Combine specialized agents to handle complex tasks, passing information and work seamlessly from one agent to another.",
  },
  {
    id: "monitor-every-run",
    icon: Activity,
    title: "Monitor Every Run",
    description:
      "Track executions, results, performance and activity in real time so you always know what your agents are doing.",
  },
];
