import Link from "next/link";
import { getAdminDb } from "@/lib/firebase/admin";

async function getDashboardMetrics() {
  try {
    const db = getAdminDb();

    const [caseStudies, testimonials, faqs, offers, leads] = await Promise.all([
      db.collection("case_studies").where("is_published", "==", true).get(),
      db.collection("testimonials").where("is_published", "==", true).get(),
      db.collection("faqs").where("is_published", "==", true).get(),
      db.collection("offers").where("is_published", "==", true).get(),
      db.collection("leads").orderBy("created_at", "desc").limit(5).get(),
    ]);

    const recentLeads = leads.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || "—",
      email: doc.data().email || "—",
      company: doc.data().company || "—",
      status: doc.data().status || "new",
      created_at: doc.data().created_at?.toDate?.()?.toLocaleDateString() || "—",
    }));

    return {
      publishedCaseStudies: caseStudies.size,
      publishedTestimonials: testimonials.size,
      publishedFAQs: faqs.size,
      publishedOffers: offers.size,
      recentLeads,
    };
  } catch {
    return {
      publishedCaseStudies: 0,
      publishedTestimonials: 0,
      publishedFAQs: 0,
      publishedOffers: 0,
      recentLeads: [],
    };
  }
}

const statCards = [
  { label: "Case Studies", href: "/admin/case-studies", key: "publishedCaseStudies" as const },
  { label: "Testimonials", href: "/admin/testimonials", key: "publishedTestimonials" as const },
  { label: "FAQs", href: "/admin/faqs", key: "publishedFAQs" as const },
  { label: "Offers", href: "/admin/offers", key: "publishedOffers" as const },
];

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300",
  qualified: "bg-green-500/20 text-green-300",
  booked: "bg-purple-500/20 text-purple-300",
  closed: "bg-gray-500/20 text-gray-300",
  unqualified: "bg-red-500/20 text-red-300",
};

export default async function AdminDashboard() {
  const metrics = await getDashboardMetrics();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted mb-8">
        Manage your site content, theme, and leads.
      </p>

      <div className="grid md:grid-cols-4 gap-4 mb-10">
        {statCards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <p className="text-sm text-muted mb-1">{card.label}</p>
            <p className="text-3xl font-bold text-primary">{metrics[card.key]}</p>
            <p className="text-xs text-muted mt-1">published</p>
          </Link>
        ))}
      </div>

      <div className="flex gap-3 mb-10">
        <Link
          href="/admin/leads"
          className="px-4 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          View Leads
        </Link>
        <Link
          href="/admin/settings"
          className="px-4 py-2.5 rounded-lg border border-border text-sm hover:bg-surface-light transition-colors"
        >
          Theme Settings
        </Link>
        <Link
          href="/admin/agent-templates"
          className="px-4 py-2.5 rounded-lg border border-border text-sm hover:bg-surface-light transition-colors"
        >
          Agent Templates
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Leads</h2>
        {metrics.recentLeads.length === 0 ? (
          <p className="text-sm text-muted">No leads yet.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Date</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-xs text-muted">{lead.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{lead.company}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[lead.status] || "bg-gray-500/20 text-gray-300"}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{lead.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
