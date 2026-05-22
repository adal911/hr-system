"use client";

import { useAuth } from "@/context/auth-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-aurora">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Decorative top accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-linear-to-b from-primary/4 via-transparent to-transparent" />
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
