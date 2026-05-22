"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { NAV_ITEMS, NavItem } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Search,
  MessageSquare,
  ClipboardList,
  Users,
  GitCompare,
  Target,
  Sparkles,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/resumes": FileText,
  "/search": Search,
  "/compare": GitCompare,
  "/jd-match": Target,
  "/chatbot": MessageSquare,
  "/interviews": ClipboardList,
  "/admin/users": Users,
};

export function AppSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const filteredItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const groups = filteredItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-chart-4 shadow-md shadow-primary/20">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
            <div className="absolute -inset-px rounded-lg ring-1 ring-white/20 dark:ring-white/10" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              HR Data Room
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              AI Recruitment
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {Object.entries(groups).map(([groupName, items]) => (
          <div key={groupName} className="mb-6 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {groupName}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = iconMap[item.href] || LayoutDashboard;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                    )}
                  >
                    {isActive && (
                      <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer card */}
      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg border border-sidebar-border bg-linear-to-br from-primary/5 via-transparent to-chart-4/5 p-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <p className="text-xs font-medium text-sidebar-foreground">
              System Online
            </p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            RAG + Hybrid Search active
          </p>
        </div>
      </div>
    </aside>
  );
}
