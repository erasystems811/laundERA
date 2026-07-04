"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  {
    href: "/dashboard",
    label: "Orders",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
    ),
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M3 10h18" />
      </svg>
    ),
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19V5M4 19h16M8 15v-4M12 15V9M16 15v-6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8l9-4 9 4-9 4-9-4z" />
        <path d="M3 8v8l9 4 9-4V8" />
        <path d="M12 12v8" />
      </svg>
    ),
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/orders") || pathname.startsWith("/dashboard/new");
  return pathname.startsWith(href);
}

export function Shell({
  businessName,
  staffName,
  paused,
  logo,
  children,
}: {
  businessName: string;
  staffName: string;
  paused: boolean;
  logo: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-teal-500/20 text-teal-800"
                : "text-muted hover:bg-white/50 hover:text-ink"
            }`}
          >
            <span className={`h-5 w-5 ${active ? "text-teal-600" : "text-muted-2"}`}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white">
          {logo}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-teal-900">{businessName}</p>
          <p className="text-[11px] text-muted-2">LaundERA</p>
        </div>
      </div>
      {nav}
      <div className="border-t border-ink/10 px-5 py-3">
        <p className="text-xs text-muted">Signed in as</p>
        <p className="truncate text-sm font-medium text-ink">{staffName}</p>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="glass-card m-3 hidden w-60 shrink-0 flex-col rounded-3xl md:flex print:hidden">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-teal-900/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="glass-card absolute inset-y-3 left-3 flex w-60 flex-col rounded-3xl">
            {sidebarInner}
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 pt-4 md:hidden print:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="glass-card flex h-10 w-10 items-center justify-center rounded-xl text-teal-700"
            aria-label="Menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-teal-900">{businessName}</p>
        </div>

        {paused && (
          <div className="mx-4 mt-3 rounded-xl bg-amber-500/90 px-4 py-2.5 text-center text-sm font-medium text-white md:mx-6 lg:mx-8">
            Your account is paused — view only. Please contact ERA Systems.
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
