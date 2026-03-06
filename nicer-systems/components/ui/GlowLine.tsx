export function GlowLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px w-full bg-[var(--gradient-glow-line)] opacity-30 ${className}`}
      aria-hidden="true"
    />
  );
}
