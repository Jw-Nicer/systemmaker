import Image from "next/image";
import { getPublishedTestimonials } from "@/lib/firestore/testimonials";

export async function TestimonialsSection() {
  const testimonials = await getPublishedTestimonials();

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-[#d9d1c3] bg-[#f4efe5] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-3xl sm:mb-12">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7e7b70] sm:tracking-[0.3em]">
            Testimonials
          </p>
          <h2 className="mt-4 font-[var(--font-editorial)] text-4xl leading-[0.96] tracking-[-0.04em] text-[#1d2318] sm:text-5xl md:text-7xl">
            What operators say
          </h2>
          <p className="mt-4 text-base leading-7 text-[#50584b]">
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
                className="flex h-full flex-col rounded-[30px] border border-[#ddd5c7] bg-[#f8f4ea] p-6 shadow-[0_18px_50px_rgba(77,63,43,0.08)]"
              >
                <p className="text-base leading-7 text-[#33402e]">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-4 border-t border-[#ddd5c7] pt-5">
                  {testimonial.avatar_url ? (
                    <Image
                      src={testimonial.avatar_url}
                      alt={testimonial.name}
                      width={52}
                      height={52}
                      className="h-[52px] w-[52px] rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#dde6d8] text-sm font-semibold text-[#3e5736]">
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[#1d2318]">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-[#596351]">
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
