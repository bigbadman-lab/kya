export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQS_DATA: FAQItem[] = [
  {
    id: "what-is-relay",
    question: "What is Relay?",
    answer:
      "Relay is an AI-powered automation platform that connects your tools, builds multi-agent workflows and executes complex business processes autonomously.",
  },
  {
    id: "how-do-agents-work",
    question: "How do AI agents work in Relay?",
    answer:
      "AI agents in Relay are specialized autonomous assistants equipped with specific context, permissions and tool access. They collaborate together, execute multi-step tasks and request human approval when needed.",
  },
  {
    id: "tools-connection",
    question: "What tools can I connect to Relay?",
    answer:
      "Relay integrates with over 50+ popular tools and services including Slack, Notion, GitHub, Linear, Google Workspace, PostgreSQL and custom API endpoints via webhooks.",
  },
  {
    id: "custom-workflows",
    question: "Can I create custom workflows?",
    answer:
      "Yes, you can build custom workflows using our visual drag-and-drop builder, write custom logic or describe your desired automation using natural language prompts.",
  },
  {
    id: "monitoring",
    question: "How do I monitor my agents and workflows?",
    answer:
      "Relay provides real-time execution logs, live agent decision tracing, step-by-step history and performance analytics directly inside your centralized dashboard.",
  },
];

export const faqs = FAQS_DATA;
