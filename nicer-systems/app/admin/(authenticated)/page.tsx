export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Welcome to Nicer Admin</h1>
      <p className="text-muted mb-8">
        Manage your site content, theme, and leads.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="font-semibold mb-1">Case Studies</h3>
          <p className="text-sm text-muted">Create and manage proof of work.</p>
          <p className="mt-4 text-3xl font-bold text-primary">0</p>
          <p className="text-xs text-muted">published</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="font-semibold mb-1">Leads</h3>
          <p className="text-sm text-muted">Track incoming inquiries.</p>
          <p className="mt-4 text-3xl font-bold text-primary">0</p>
          <p className="text-xs text-muted">this week</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="font-semibold mb-1">Theme</h3>
          <p className="text-sm text-muted">Customize colors and effects.</p>
          <div className="mt-4 flex gap-2">
            <div className="w-8 h-8 rounded-full bg-primary" />
            <div className="w-8 h-8 rounded-full bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}
