import Link from "next/link";

interface LogoProps {
  className?: string;
  variant?: "light" | "dark" | "minimal";
  size?: "sm" | "md" | "lg";
}

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function Logo({ className, variant = "light", size = "md" }: LogoProps) {
  const isDark = variant === "dark";

  const sizeClasses = {
    sm: {
      container: "gap-2",
      wordmark: "gap-1.5",
      nicer: "text-[1.05rem]",
      systems: "text-[8.5px] tracking-[0.28em]",
      markWrap: "h-5 w-5 rounded-md",
      markCore: "h-2 w-2 rounded-sm",
    },
    md: {
      container: "gap-2.5",
      wordmark: "gap-1.5",
      nicer: "text-[1.25rem]",
      systems: "text-[10px] tracking-[0.3em]",
      markWrap: "h-6 w-6 rounded-[10px]",
      markCore: "h-2.5 w-2.5 rounded-[4px]",
    },
    lg: {
      container: "gap-3",
      wordmark: "gap-2",
      nicer: "text-[1.75rem]",
      systems: "text-[14px] tracking-[0.3em]",
      markWrap: "h-8 w-8 rounded-[12px]",
      markCore: "h-3 w-3 rounded-[5px]",
    },
  };

  const currentSize = sizeClasses[size];

  const nicerColor = isDark ? "text-[#f4efe5]" : "text-[#161d12]";
  const systemsColor = isDark ? "text-[#cbd3c2]" : "text-[#4c5840]";
  const markFrame = isDark
    ? "border border-white/12 bg-[linear-gradient(180deg,rgba(244,239,229,0.12),rgba(244,239,229,0.04))]"
    : "border border-[#d8d0c0] bg-[linear-gradient(180deg,#faf6ee,#efe7d9)]";
  const markCore = isDark
    ? "bg-[linear-gradient(180deg,#a7ba75,#5e742d)] shadow-[0_0_20px_rgba(134,160,74,0.28)]"
    : "bg-[linear-gradient(180deg,#758941,#4f6328)] shadow-[0_6px_16px_rgba(79,99,40,0.22)]";

  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center transition-opacity hover:opacity-90",
        currentSize.container,
        className
      )}
    >
      {variant !== "minimal" && (
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-[1.04]",
            currentSize.markWrap,
            markFrame
          )}
        >
          <div
            className={cn(
              "absolute inset-[18%] rounded-[inherit] border border-white/30 opacity-55",
              isDark ? "border-white/10" : "border-white/60"
            )}
          />
          <div className={cn(currentSize.markCore, markCore)} />
        </div>
      )}

      <div className={cn("flex items-baseline", currentSize.wordmark)}>
        <span
          className={cn(
            "font-[var(--font-editorial)] leading-none tracking-[-0.04em]",
            currentSize.nicer,
            nicerColor
          )}
        >
          nicer
        </span>
        <span
          className={cn(
            "font-sans font-semibold uppercase leading-none",
            currentSize.systems,
            systemsColor
          )}
        >
          systems
        </span>
      </div>
    </Link>
  );
}
