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
        <span className="inline-block text-xs font-mono uppercase tracking-[0.2em] text-primary/70 mb-3">
          {`// ${eyebrow}`}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl font-bold text-glow mb-4">
        {title}
      </h2>
      {description && (
        <p className="text-muted max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
