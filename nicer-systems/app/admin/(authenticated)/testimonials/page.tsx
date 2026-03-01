import { getAllTestimonials } from "@/lib/actions/testimonials";
import TestimonialsManager from "./TestimonialsManager";

export default async function AdminTestimonialsPage() {
  const testimonials = await getAllTestimonials();

  return <TestimonialsManager initialData={testimonials} />;
}
