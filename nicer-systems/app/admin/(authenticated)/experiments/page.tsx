import { getAllExperiments } from "@/lib/actions/experiments";
import { getExperimentExposureSummaries } from "@/lib/admin/analytics";
import ExperimentsManager from "./ExperimentsManager";

export default async function AdminExperimentsPage() {
  const [experiments, metricsByExperiment] = await Promise.all([
    getAllExperiments(),
    getExperimentExposureSummaries(),
  ]);

  return (
    <ExperimentsManager
      initialData={experiments}
      metricsByExperiment={metricsByExperiment}
    />
  );
}
