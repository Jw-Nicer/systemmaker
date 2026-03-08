import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/auth";
import { getVariantForPreview } from "@/lib/actions/variant-preview";
import { normalizeVariantSections } from "@/lib/marketing/variant-content";
import { VariantLandingPage } from "@/components/marketing/VariantLandingPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VariantPreviewPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const variant = await getVariantForPreview(id);
  if (!variant) notFound();

  return (
    <VariantLandingPage
      landingPath={`/preview/variant/${variant.id}`}
      industrySlug={variant.slug}
      industryName={`${variant.industry} Preview`}
      sections={normalizeVariantSections(variant)}
    />
  );
}
