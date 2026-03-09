import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/auth";
import SidebarNav from "./SidebarNav";
import { Logo } from "@/components/ui/Logo";

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
    <div className="min-h-screen bg-[#f3ede1] text-[#1d2318] md:flex">
      <aside aria-label="Admin sidebar" className="flex w-full shrink-0 flex-col border-b border-[#294133]/18 bg-[linear-gradient(180deg,#172d20,#193126)] text-[#efe8da] md:min-h-screen md:w-72 md:border-b-0 md:border-r">
        <div className="border-b border-white/10 px-6 py-6">
          <Logo size="md" variant="dark" />
          <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-[#9faf9f]">
            Admin Console
          </p>
          <p className="mt-2 text-sm leading-6 text-[#c2cac0]">
            Content, leads, experiments, and settings aligned to the live brand system.
          </p>
        </div>
        <SidebarNav />
        <div className="mt-auto border-t border-white/10 px-6 py-5">
          <p className="truncate text-xs text-[#aab6a8]">{user.email}</p>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="mt-3 text-xs font-medium text-[#efe8da] transition-colors hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-20 items-center justify-between border-b border-[#d9d1c3] bg-[#f3ede1]/95 px-6 backdrop-blur-sm md:px-8">
          <div>
            <Logo size="sm" variant="light" />
            <h1 className="mt-1 text-sm font-medium text-[#46523a]">
              Operations Admin
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/preview/site"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
            >
              Preview Site
            </a>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-4 py-2 text-sm text-[#27311f] transition-colors hover:bg-white"
            >
              View site
            </a>
          </div>
        </header>
        <main className="flex-1 px-6 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
