import { getAllFAQs } from "@/lib/actions/faqs";
import FAQsManager from "./FAQsManager";

export default async function AdminFAQsPage() {
  const faqs = await getAllFAQs();

  return <FAQsManager initialData={faqs} />;
}
