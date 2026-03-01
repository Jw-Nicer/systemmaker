import { getAllEmailSequences } from "@/lib/actions/email-sequences";
import EmailSequencesManager from "./EmailSequencesManager";

export default async function AdminEmailSequencesPage() {
  const sequences = await getAllEmailSequences();

  return <EmailSequencesManager initialData={sequences} />;
}
