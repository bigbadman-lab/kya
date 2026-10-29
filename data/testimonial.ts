export interface Testimonial {
  id: string | number;
  quote: string;
  name: string;
  role: string;
  image: string;
}

export const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 1,
    quote:
      '"Relay took hours of repetitive work off our plate. Our weekly reports now run automatically without any manual effort."',
    name: "Daniel Brooks",
    role: "Revenue Operations",
    image:
      "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200",
  },
  {
    id: 2,
    quote:
      '"We connected our existing tools and had our first workflow running in minutes. The entire setup was remarkably simple and intuitive."',
    name: "Maya Chen",
    role: "Head of Operations",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: 3,
    quote:
      '"Relay handles repetitive support tasks so our team can focus on helping customers and resolving issues."',
    name: "Alex Morgan",
    role: "Operations Manager",
    image:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200",
  },
  {
    id: 4,
    quote:
      '"Human approval steps give us confidence to automate important workflows while keeping our team in control."',
    name: "Sarah Mitchell",
    role: "Customer Success Lead",
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: 5,
    quote:
      '"Relay connects the tools we use and keeps information moving automatically, without manual handoffs."',
    name: "Noah Williams",
    role: "Growth Lead",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: 6,
    quote:
      '"We started with one automation and quickly expanded to multiple workflows as our team\'s needs grew."',
    name: "Christofer Levin",
    role: "Product Operations",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  },
];
