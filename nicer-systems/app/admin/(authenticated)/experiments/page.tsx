import { getAllExperiments } from "@/lib/actions/experiments";
import ExperimentsManager from "./ExperimentsManager";

export default async function AdminExperimentsPage() {
  const experiments = await getAllExperiments();

  return <ExperimentsManager initialData={experiments} />;
}
