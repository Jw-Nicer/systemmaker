import { getHomepageLayoutForAdmin } from "@/lib/firestore/homepage-layout";
import HomepageLayoutManager from "./HomepageLayoutManager";

export default async function AdminHomepageLayoutPage() {
  const layout = await getHomepageLayoutForAdmin();
  return <HomepageLayoutManager initialLayout={layout} />;
}
