type BadgeVariant = "primary" | "secondary" | "muted" | "success" | "warning" | "danger";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  primary: "bg-primary/8 text-primary border-primary/15",
  secondary: "bg-secondary/8 text-secondary border-secondary/15",
  muted: "bg-surface-light text-muted border-border",
  success: "bg-green-500/8 text-green-400 border-green-500/15",
  warning: "bg-yellow-500/8 text-yellow-400 border-yellow-500/15",
  danger: "bg-red-500/8 text-red-400 border-red-500/15",
};

export function Badge({
  children,
  variant = "primary",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border transition-colors duration-300 ${variantMap[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
