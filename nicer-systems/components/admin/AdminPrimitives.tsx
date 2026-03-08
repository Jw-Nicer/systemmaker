import type { ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#d9d1c3] pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#7e7b70]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[#1d2318] md:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#556052] md:text-base">
            {description}
          </p>
        )}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function AdminPanel({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "accent" | "soft";
}) {
  const toneClasses = {
    default:
      "border-[#d7d0c1] bg-[linear-gradient(180deg,#faf7ef,#f0e8db)] shadow-[0_18px_56px_rgba(70,58,40,0.07)]",
    accent:
      "border-[#2d4a35]/18 bg-[linear-gradient(180deg,#1b3224,#213b2c)] text-[#f0e9db] shadow-[0_18px_56px_rgba(20,40,29,0.22)]",
    soft:
      "border-[#d7d0c1] bg-[linear-gradient(180deg,#f7f2e8,#ece4d5)] shadow-[0_14px_42px_rgba(70,58,40,0.06)]",
  };

  return (
    <div className={cn("rounded-[28px] border p-6", toneClasses[tone], className)}>
      {children}
    </div>
  );
}

export function AdminMetricCard({
  label,
  value,
  meta,
  href,
}: {
  label: string;
  value: ReactNode;
  meta?: string;
  href?: string;
}) {
  const content = (
    <AdminPanel className="h-full transition-transform hover:-translate-y-0.5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7e7b70]">{label}</p>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#1d2318]">
        {value}
      </p>
      {meta ? <p className="mt-2 text-sm text-[#596351]">{meta}</p> : null}
    </AdminPanel>
  );

  if (!href) return content;
  return <a href={href}>{content}</a>;
}

export function AdminPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "blue" | "yellow" | "red" | "purple";
}) {
  const toneClasses = {
    neutral: "border-[#d5cdbd] bg-white/60 text-[#556052]",
    green: "border-[#9bb286]/24 bg-[#e8eedf] text-[#4f6032]",
    blue: "border-sky-200/40 bg-sky-100/80 text-sky-700",
    yellow: "border-amber-200/40 bg-amber-100/80 text-amber-700",
    red: "border-red-200/40 bg-red-100/80 text-red-700",
    purple: "border-purple-200/40 bg-purple-100/80 text-purple-700",
  };

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium", toneClasses[tone])}>
      {children}
    </span>
  );
}
