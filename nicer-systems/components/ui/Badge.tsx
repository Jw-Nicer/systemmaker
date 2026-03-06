type BadgeVariant = "primary" | "secondary" | "muted" | "success" | "warning" | "danger";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  glow?: boolean;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary/10 text-secondary border-secondary/20",
  muted: "bg-surface-light text-muted border-border",
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function Badge({
  children,
  variant = "primary",
  glow = false,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border ${variantMap[variant]} ${glow ? "shadow-[var(--glow-sm)]" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
