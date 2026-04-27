"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/portal/management-x7k9/login") {
      router.push("/portal/management-x7k9/login");
    }
  }, [status, pathname, router]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (pathname === "/portal/management-x7k9/login") {
    return <div className="admin-shell">{children}</div>;
  }

  if (status === "loading") {
    return (
      <div className="admin-shell min-h-screen flex items-center justify-center">
        <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
          Loading…
        </p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="admin-shell min-h-screen flex">
      {/* Mobile top bar */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 h-12 flex items-center px-3 z-40 gap-2"
        style={{
          background: "var(--a-bg)",
          borderBottom: "1px solid var(--a-border)",
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded hover:bg-[var(--a-bg-hover)]"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" style={{ color: "var(--a-text)" }} />
        </button>
        <span className="text-[13px] font-semibold" style={{ color: "var(--a-text)" }}>
          UyJoy
        </span>
      </header>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        className="flex-1 overflow-auto mt-12 md:mt-0 md:ml-[232px]"
        style={{ background: "var(--a-bg)" }}
      >
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminGuard>{children}</AdminGuard>
    </SessionProvider>
  );
}
