import Link from "next/link";
import { getAdminDb } from "@/lib/firebase/admin";
import { getFollowUps } from "@/lib/actions/leads";
import {
  EMPTY_DASHBOARD_ANALYTICS,
  getDashboardAnalytics,
} from "@/lib/admin/analytics";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";

async function getDashboardMetrics() {
  try {
    const db = getAdminDb();

    const [caseStudies, testimonials, faqs, offers, allLeads, recentLeadsSnap, experiments, analytics] = await Promise.all([
      db.collection("case_studies").where("is_published", "==", true).get(),
      db.collection("testimonials").where("is_published", "==", true).get(),
      db.collection("faqs").where("is_published", "==", true).get(),
      db.collection("offers").where("is_published", "==", true).get(),
      db.collection("leads").get(),
      db.collection("leads").orderBy("created_at", "desc").limit(5).get(),
      db.collection("experiments").get(),
      getDashboardAnalytics(),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentLeads = recentLeadsSnap.docs.map((doc: any) => ({
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
      totalLeads: allLeads.size,
      totalExperiments: experiments.size,
      recentLeads,
      analytics,
      loadError: false,
    };
  } catch {
    return {
      publishedCaseStudies: 0,
      publishedTestimonials: 0,
      publishedFAQs: 0,
      publishedOffers: 0,
      totalLeads: 0,
      totalExperiments: 0,
      recentLeads: [],
      analytics: EMPTY_DASHBOARD_ANALYTICS,
      loadError: true,
    };
  }
}

const statCards = [
  { label: "Case Studies", href: "/admin/case-studies", key: "publishedCaseStudies" as const, meta: "Published" },
  { label: "Testimonials", href: "/admin/testimonials", key: "publishedTestimonials" as const, meta: "Published" },
  { label: "FAQs", href: "/admin/faqs", key: "publishedFAQs" as const, meta: "Published" },
  { label: "Offers", href: "/admin/offers", key: "publishedOffers" as const, meta: "Published" },
  { label: "Leads", href: "/admin/leads", key: "totalLeads" as const, meta: "Total records" },
  { label: "Experiments", href: "/admin/experiments", key: "totalExperiments" as const, meta: "All statuses" },
];

const statusColors: Record<string, string> = {
  new: "blue",
  qualified: "green",
  booked: "purple",
  closed: "neutral",
  unqualified: "red",
};

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export default async function AdminDashboard() {
  const [metrics, followUps] = await Promise.all([
    getDashboardMetrics(),
    getFollowUps(),
  ]);

  const now = new Date();
  const overdueFollowUps = followUps.filter(
    (l) => l.follow_up_at && new Date(l.follow_up_at) < now
  );
  const upcomingFollowUps = followUps.filter(
    (l) => l.follow_up_at && new Date(l.follow_up_at) >= now
  );

  return (
    <div>
      <AdminPageHeader
        eyebrow="Admin"
        title="Dashboard"
        description="Monitor published content, lead activity, and the next operational tasks from one surface."
        actions={
          <>
            <Link
              href="/admin/leads"
              className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
            >
              View Leads
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-medium text-[#27311f] transition-colors hover:bg-white"
            >
              Theme Settings
            </Link>
          </>
        }
      />

      {metrics.loadError ? (
        <div className="mt-8 rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Dashboard metrics are partially unavailable right now. Counts below may be incomplete until the data source recovers.
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {statCards.map((card) => (
          <AdminMetricCard
            key={card.key}
            href={card.href}
            label={card.label}
            value={metrics[card.key]}
            meta={card.meta}
          />
        ))}
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[#1d2318]">Funnel</h2>
          <AdminPill tone="blue">
            Last {metrics.analytics.windowDays} days
          </AdminPill>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="Landing Views"
            value={metrics.analytics.funnel.landingViews}
            meta="Tracked visits"
          />
          <AdminMetricCard
            label="Preview Starts"
            value={metrics.analytics.funnel.previewStarts}
            meta="Demo + chat starts"
          />
          <AdminMetricCard
            label="Preview Completed"
            value={metrics.analytics.funnel.previewCompleted}
            meta={`${formatPercent(metrics.analytics.funnel.previewCompletionRate)} of starts`}
          />
          <AdminMetricCard
            label="Leads Submitted"
            value={metrics.analytics.funnel.leadsSubmitted}
            meta={`${formatPercent(metrics.analytics.funnel.leadConversionRate)} of landing views`}
          />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <AdminPanel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#7e7b70]">
                  Top Landing Paths
                </p>
                <p className="mt-2 text-sm text-[#596351]">
                  Compare where traffic lands against where leads actually convert.
                </p>
              </div>
              <AdminPill tone="neutral">
                {metrics.analytics.topLandingPaths.length} tracked
              </AdminPill>
            </div>
            {metrics.analytics.topLandingPaths.length === 0 ? (
              <p className="mt-4 text-sm text-[#6c7467]">
                No landing-path analytics captured yet.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-[20px] border border-[#ddd5c7] bg-white/50">
                <table className="w-full text-sm">
                  <thead className="bg-white/60">
                    <tr className="border-b border-[#ddd5c7]">
                      <th className="px-4 py-3 text-left font-medium text-[#6c7467]">Path</th>
                      <th className="px-4 py-3 text-left font-medium text-[#6c7467]">Views</th>
                      <th className="px-4 py-3 text-left font-medium text-[#6c7467]">Leads</th>
                      <th className="px-4 py-3 text-left font-medium text-[#6c7467]">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.analytics.topLandingPaths.map((path) => (
                      <tr key={path.path} className="border-b border-[#e1d9cb] last:border-0">
                        <td className="px-4 py-3 font-medium text-[#1d2318]">{path.path}</td>
                        <td className="px-4 py-3 text-[#596351]">{path.views}</td>
                        <td className="px-4 py-3 text-[#596351]">{path.leads}</td>
                        <td className="px-4 py-3 text-[#596351]">{formatPercent(path.conversionRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminPanel>

          <div className="grid gap-4">
            <AdminPanel tone="accent">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#d9d1c3]">
                Conversion Signals
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-3xl font-semibold tracking-[-0.04em]">
                    {metrics.analytics.funnel.previewPlanEmailCaptures}
                  </p>
                  <p className="mt-1 text-sm text-[#d8cfbe]">
                    Plan email captures
                  </p>
                  <p className="mt-1 text-xs text-[#bcb39f]">
                    {formatPercent(metrics.analytics.funnel.previewEmailCaptureRate)} of completed previews
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-semibold tracking-[-0.04em]">
                    {metrics.analytics.funnel.bookingClicks}
                  </p>
                  <p className="mt-1 text-sm text-[#d8cfbe]">
                    Booking clicks
                  </p>
                  <p className="mt-1 text-xs text-[#bcb39f]">
                    {formatPercent(metrics.analytics.funnel.bookingClickRate)} of leads
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-semibold tracking-[-0.04em]">
                    {metrics.analytics.funnel.planShares}
                  </p>
                  <p className="mt-1 text-sm text-[#d8cfbe]">
                    Plan share actions
                  </p>
                  <p className="mt-1 text-xs text-[#bcb39f]">
                    {metrics.analytics.funnel.sharedPlanViews} shared-plan views
                  </p>
                </div>
              </div>
            </AdminPanel>

            <AdminPanel>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#7e7b70]">
                    Lead Sources
                  </p>
                  <p className="mt-2 text-sm text-[#596351]">
                    Based on UTM source when available, then fall back to lead source.
                  </p>
                </div>
                <AdminPill tone="neutral">
                  {metrics.analytics.leadSources.length} sources
                </AdminPill>
              </div>
              {metrics.analytics.leadSources.length === 0 ? (
                <p className="mt-4 text-sm text-[#6c7467]">No lead source data yet.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {metrics.analytics.leadSources.map((source) => (
                    <div
                      key={source.source}
                      className="flex items-center justify-between rounded-[18px] border border-[#ddd5c7] bg-white/55 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[#1d2318]">{source.source}</span>
                      <AdminPill tone="blue">{source.leads} leads</AdminPill>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>
          </div>
        </div>
      </div>

      {followUps.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[#1d2318]">
              Follow-ups
            </h2>
            {overdueFollowUps.length > 0 && (
              <AdminPill tone="red">
                {overdueFollowUps.length} overdue
              </AdminPill>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...overdueFollowUps, ...upcomingFollowUps].slice(0, 6).map((lead) => {
              const isOverdue = lead.follow_up_at && new Date(lead.follow_up_at) < now;
              return (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className={`rounded-[24px] border p-5 transition-colors ${
                    isOverdue
                      ? "border-red-200/60 bg-[#fff3f1] hover:border-red-300"
                      : "border-[#d7d0c1] bg-[linear-gradient(180deg,#faf7ef,#f0e8db)] hover:border-[#aab69a]"
                  }`}
                >
                  <p className="text-sm font-medium text-[#1d2318]">{lead.name || "Unnamed"}</p>
                  <p className="text-xs text-[#6c7467]">{lead.company || lead.email}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <AdminPill tone={isOverdue ? "red" : "blue"}>
                      {isOverdue ? "Overdue" : "Upcoming"}
                    </AdminPill>
                    <span className="text-xs text-[#6c7467]">
                      {lead.follow_up_at &&
                        new Date(lead.follow_up_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                    </span>
                  </div>
                  {lead.follow_up_note && <p className="mt-2 text-xs text-[#6c7467] truncate">{lead.follow_up_note}</p>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1d2318]">Recent Leads</h2>
          <Link href="/admin/agent-templates" className="text-sm text-[#4f6032] hover:underline">
            Agent Templates
          </Link>
        </div>
        {metrics.recentLeads.length === 0 ? (
          <AdminPanel className="text-sm text-[#6c7467]">No leads yet.</AdminPanel>
        ) : (
          <AdminPanel className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-white/55">
                <tr className="border-b border-[#ddd5c7]">
                  <th className="px-4 py-3 text-left font-medium text-[#6c7467]">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6c7467]">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6c7467]">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6c7467]">Date</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[#e1d9cb] last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1d2318]">{lead.name}</p>
                      <p className="text-xs text-[#6c7467]">{lead.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[#596351]">{lead.company}</td>
                    <td className="px-4 py-3">
                      <AdminPill tone={(statusColors[lead.status] as "blue" | "green" | "purple" | "red" | "neutral") || "neutral"}>
                        {lead.status}
                      </AdminPill>
                    </td>
                    <td className="px-4 py-3 text-[#596351]">{lead.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminPanel>
        )}
      </div>
    </div>
  );
}
