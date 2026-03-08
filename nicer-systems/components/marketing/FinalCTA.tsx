import { TrackedLink } from "@/components/marketing/TrackedLink";
import { EVENTS } from "@/lib/analytics";

interface FinalCTAProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaText?: string;
}

export function FinalCTA({
  eyebrow = "Available now",
  title = "Put the workflow\nin focus",
  description = "Start with a scoping conversation, generate a preview plan, and use it to align the workflow, metrics, alerts, and implementation scope before any build work starts.",
  ctaText,
}: FinalCTAProps = {}) {
  return (
    <section
      id="get-started"
      className="relative overflow-hidden border-b border-[#d9d1c3] bg-[#f4efe5] px-4 py-16 text-[#1d2318] sm:px-6 sm:py-24 lg:px-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,54,42,0.14),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(224,193,147,0.12),transparent_18%)]" />
      <div className="mx-auto max-w-6xl rounded-[28px] border border-[#2d4632]/18 bg-[linear-gradient(180deg,#21402f,#163122)] px-5 py-10 text-center text-[#f3ecdf] shadow-[0_28px_100px_rgba(5,10,7,0.28)] sm:rounded-[40px] sm:px-8 sm:py-14">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/14 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.94),rgba(179,207,181,0.28)_38%,rgba(38,61,43,0.24)_100%)] shadow-[inset_0_0_30px_rgba(255,255,255,0.3),0_20px_70px_rgba(9,18,12,0.28)] sm:h-36 sm:w-36">
          <div className="rounded-[22px] border border-[#1d2d22]/15 bg-white/72 p-3 text-[#172117] sm:rounded-[26px] sm:p-4">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
        </div>

        <p className="mt-8 text-[11px] uppercase tracking-[0.16em] text-[#b6c4b5]">{eyebrow}</p>
        <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.95] tracking-[-0.04em] sm:text-5xl md:text-7xl">
          {title.split("\n").map((line, index, arr) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < arr.length - 1 && <br />}
            </span>
          ))}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#c6d0c3]">
          {description}
        </p>
        <TrackedLink
          href="/contact"
          eventName={EVENTS.CTA_CLICK_BOOK}
          className="mt-9 inline-flex rounded-full bg-[#f2eadb] px-6 py-3 text-sm font-medium text-[#132015] transition-transform hover:scale-[1.02] sm:px-7"
        >
          {ctaText ?? "Start the Scoping Call"}
        </TrackedLink>
      </div>
    </section>
  );
}
