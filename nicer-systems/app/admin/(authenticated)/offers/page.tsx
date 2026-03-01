import { getAllOffers } from "@/lib/actions/offers";
import OffersManager from "./OffersManager";

export default async function AdminOffersPage() {
  const offers = await getAllOffers();

  return <OffersManager initialData={offers} />;
}
