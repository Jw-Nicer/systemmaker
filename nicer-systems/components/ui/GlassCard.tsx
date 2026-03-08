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
      className={`rounded-[var(--radius-lg)] border border-glass-border bg-glass-bg backdrop-blur-[var(--glass-blur)] ${hover ? "organic-border hover:shadow-[var(--shadow-soft-sm)] hover:-translate-y-0.5 transition-all duration-300" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
