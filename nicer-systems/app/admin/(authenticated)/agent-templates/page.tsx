import { getAllTemplates } from "@/lib/actions/agent-templates";
import TemplateEditor from "./TemplateEditor";

export default async function AdminAgentTemplatesPage() {
  const templates = await getAllTemplates();

  return <TemplateEditor initialData={templates} />;
}
