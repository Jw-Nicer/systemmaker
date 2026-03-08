interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  center = true,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`${center ? "text-center" : ""} mb-16 ${className}`}>
      {eyebrow && (
        <span className="inline-block text-xs uppercase tracking-[0.2em] text-primary/70 mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-soft-glow mb-4">
        {title}
      </h2>
      {center && (
        <div className="mx-auto mt-3 mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-primary via-secondary to-tertiary opacity-60" />
      )}
      {description && (
        <p className="text-muted max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
