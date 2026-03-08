export function WaveDivider({
  className = "",
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        className={`w-full h-6 md:h-10 ${flip ? "rotate-180" : ""}`}
        fill="none"
      >
        <defs>
          <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity="0" />
            <stop offset="30%" stopColor="var(--theme-primary)" stopOpacity="0.12" />
            <stop offset="50%" stopColor="var(--theme-secondary)" stopOpacity="0.1" />
            <stop offset="70%" stopColor="var(--theme-tertiary)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--theme-tertiary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,20 C240,10 480,35 720,18 C960,2 1080,30 1200,20"
          stroke="url(#wave-grad)"
          strokeWidth="1.5"
        />
        <path
          d="M0,20 C240,10 480,35 720,18 C960,2 1080,30 1200,20 L1200,40 L0,40 Z"
          fill="url(#wave-grad)"
          opacity="0.3"
        />
      </svg>
    </div>
  );
}

/** @deprecated Use WaveDivider instead */
export const GlowLine = WaveDivider;
