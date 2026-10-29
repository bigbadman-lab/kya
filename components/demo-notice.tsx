export function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-zinc-700 px-4 py-3 text-sm/5.5 text-zinc-300">
      {children}
    </p>
  );
}
