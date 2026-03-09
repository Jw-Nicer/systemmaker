import Image from "next/image";
import { getPublishedTestimonials } from "@/lib/firestore/testimonials";
import type { Testimonial } from "@/types/testimonial";

export async function TestimonialsSection({
  testimonialsData,
}: {
  testimonialsData?: Testimonial[];
} = {}) {
  const testimonials = testimonialsData ?? await getPublishedTestimonials();

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-[var(--border-light)] bg-[var(--cream-bg)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-3xl sm:mb-12">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)] sm:tracking-[0.3em]">
            Testimonials
          </p>
          <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--text-heading)] sm:text-5xl md:text-7xl">
            What operators say
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--text-body)]">
            Published testimonials from teams using Nicer Systems to tighten
            workflows, visibility, and follow-through.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((testimonial) => {
            const initials = testimonial.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <article
                key={testimonial.id}
                className="relative flex h-full flex-col rounded-[var(--radius-card-lg)] border border-[var(--border-card)] bg-[var(--cream-card)] p-6 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
              >
                {!testimonial.is_published && (
                  <span className="absolute right-3 top-3 z-10 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    Draft
                  </span>
                )}
                <p className="text-base leading-7 text-[var(--text-heading)]">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-4 border-t border-[var(--border-card)] pt-5">
                  {testimonial.avatar_url ? (
                    <Image
                      src={testimonial.avatar_url}
                      alt={testimonial.name}
                      width={52}
                      height={52}
                      className="h-[52px] w-[52px] rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#dde6d8] text-sm font-semibold text-[var(--green-accent)]">
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[var(--text-heading)]">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-[var(--text-body)]">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
