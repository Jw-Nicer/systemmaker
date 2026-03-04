import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/auth";
import SidebarNav from "./SidebarNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <Link href="/admin" className="text-lg font-bold text-primary">
            Nicer Admin
          </Link>
        </div>
        <SidebarNav />
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted truncate">{user.email}</p>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="mt-2 text-xs text-muted hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center px-8">
          <h1 className="text-sm font-medium text-muted">Admin Panel</h1>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
