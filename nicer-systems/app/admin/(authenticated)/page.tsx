import { Suspense } from "react";
import Link from "next/link";
import { getAdminDb } from "@/lib/firebase/admin";
import { getFollowUps } from "@/lib/actions/leads";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import DashboardAnalytics from "@/components/admin/DashboardAnalytics";
import PipelineMetrics from "@/components/admin/PipelineMetrics";

async function getDashboardMetrics() {
  try {
    const db = getAdminDb();

    const [caseStudies, testimonials, faqs, offers, allLeads, recentLeadsSnap, experiments] = await Promise.all([
      db.collection("case_studies").where("is_published", "==", true).count().get(),
      db.collection("testimonials").where("is_published", "==", true).count().get(),
      db.collection("faqs").where("is_published", "==", true).count().get(),
      db.collection("offers").where("is_published", "==", true).count().get(),
      db.collection("leads").count().get(),
      db.collection("leads").orderBy("created_at", "desc").limit(5).get(),
      db.collection("experiments").count().get(),
    ]);

    const recentLeads = recentLeadsSnap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || "—",
      email: doc.data().email || "—",
      company: doc.data().company || "—",
      status: doc.data().status || "new",
      created_at: doc.data().created_at?.toDate?.()?.toLocaleDateString() || "—",
    }));

    return {
      publishedCaseStudies: caseStudies.data().count,
      publishedTestimonials: testimonials.data().count,
      publishedFAQs: faqs.data().count,
      publishedOffers: offers.data().count,
      totalLeads: allLeads.data().count,
      totalExperiments: experiments.data().count,
      recentLeads,
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

function MetricsSkeleton() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-[28px] bg-[#d9d1c3]/40" />
      ))}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="mt-8 space-y-4">
      <div className="h-6 w-32 animate-pulse rounded-md bg-[#d9d1c3]/40" />
      <div className="h-48 animate-pulse rounded-[28px] bg-[#d9d1c3]/40" />
    </div>
  );
}

async function MetricsCards() {
  const metrics = await getDashboardMetrics();

  return (
    <>
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

      <RecentLeadsTable recentLeads={metrics.recentLeads} />
    </>
  );
}

function RecentLeadsTable({ recentLeads }: { recentLeads: Array<{ id: string; name: string; email: string; company: string; status: string; created_at: string }> }) {
  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1d2318]">Recent Leads</h2>
        <Link href="/admin/agent-templates" className="text-sm text-[#4f6032] hover:underline">
          Agent Templates
        </Link>
      </div>
      {recentLeads.length === 0 ? (
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
              {recentLeads.map((lead) => (
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
  );
}

async function FollowUpsSection() {
  const followUps = await getFollowUps();

  if (followUps.length === 0) return null;

  const now = new Date();
  const overdueFollowUps = followUps.filter(
    (l) => l.follow_up_at && new Date(l.follow_up_at) < now
  );
  const upcomingFollowUps = followUps.filter(
    (l) => l.follow_up_at && new Date(l.follow_up_at) >= now
  );

  return (
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
  );
}

export default function AdminDashboard() {
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
            <a
              href="/preview/site"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
            >
              Preview Site
            </a>
            <Link
              href="/admin/settings"
              className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-medium text-[#27311f] transition-colors hover:bg-white"
            >
              Theme Settings
            </Link>
          </>
        }
      />

      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsCards />
      </Suspense>

      <DashboardAnalytics />

      <PipelineMetrics />

      <Suspense fallback={<SectionSkeleton />}>
        <FollowUpsSection />
      </Suspense>
    </div>
  );
}
