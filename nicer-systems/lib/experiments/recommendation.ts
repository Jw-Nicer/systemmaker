import type { ExperimentVariant } from "@/types/experiment";
import type { ExperimentExposureSummary } from "@/types/analytics";

export interface ExperimentWinnerRecommendation {
  variantKey: string;
  variantLabel: string;
  metric: "lead_rate" | "booking_rate";
  rate: number;
  conversions: number;
  exposures: number;
  confidence: "low" | "medium";
}

function getConfidence(exposures: number): "low" | "medium" {
  return exposures >= 25 ? "medium" : "low";
}

export function getExperimentWinnerRecommendation(
  summary: ExperimentExposureSummary | undefined,
  variants: ExperimentVariant[]
): ExperimentWinnerRecommendation | null {
  if (!summary || summary.variants.length === 0) return null;

  const useLeadMetric = summary.leads > 0;
  const useBookingMetric = !useLeadMetric && summary.bookings > 0;
  if (!useLeadMetric && !useBookingMetric) return null;

  const ranked = [...summary.variants].sort((a, b) => {
    const aRate = useLeadMetric ? a.leadConversionRate : a.bookingRate;
    const bRate = useLeadMetric ? b.leadConversionRate : b.bookingRate;
    if (bRate !== aRate) return bRate - aRate;

    const aConversions = useLeadMetric ? a.leads : a.bookings;
    const bConversions = useLeadMetric ? b.leads : b.bookings;
    if (bConversions !== aConversions) return bConversions - aConversions;

    return b.exposures - a.exposures;
  });

  const top = ranked[0];
  if (!top) return null;

  const label =
    variants.find((variant) => variant.key === top.key)?.label ?? top.label;

  return {
    variantKey: top.key,
    variantLabel: label,
    metric: useLeadMetric ? "lead_rate" : "booking_rate",
    rate: useLeadMetric ? top.leadConversionRate : top.bookingRate,
    conversions: useLeadMetric ? top.leads : top.bookings,
    exposures: top.exposures,
    confidence: getConfidence(top.exposures),
  };
}
