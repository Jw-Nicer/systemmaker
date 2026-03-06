interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  as?: "div" | "article" | "section";
}

export function GlassCard({
  children,
  className = "",
  hover = false,
  as: Tag = "div",
}: GlassCardProps) {
  return (
    <Tag
      className={`rounded-xl border border-glass-border bg-glass-bg backdrop-blur-[var(--glass-blur)] ${hover ? "gradient-border hover:shadow-[var(--glow-sm)] transition-shadow" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
