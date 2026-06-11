"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Sparkles, AlertTriangle, Clock } from "lucide-react";

export function TrialBanner() {
  const { license } = useAuth();

  if (!license) return null;

  // Expired — read-only lock
  if (license.status === "expired") {
    return (
      <div className="border-b border-rose-500/30 bg-linear-to-r from-rose-500/10 via-rose-500/5 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Your trial has ended</p>
              <p className="text-xs text-muted-foreground">
                You&apos;re in read-only mode. Upgrade to continue uploading and using AI features.
              </p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-rose-500/20 transition-colors hover:bg-rose-700"
          >
            <Sparkles className="h-3 w-3" />
            Upgrade now
          </Link>
        </div>
      </div>
    );
  }

  // Trial active
  if (license.is_trial) {
    const days = license.days_remaining;
    const urgent = days <= 3;
    return (
      <div
        className={`border-b ${
          urgent
            ? "border-amber-500/30 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent"
            : "border-primary/20 bg-linear-to-r from-primary/8 via-primary/3 to-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-md ${
                urgent ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/15 text-primary"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm">
              <span className="font-semibold">{days} day{days !== 1 ? "s" : ""}</span>
              <span className="text-muted-foreground"> left in your Pro trial</span>
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-md shadow-primary/15 transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-3 w-3" />
            Upgrade
          </Link>
        </div>
      </div>
    );
  }

  // Past due — payment retry banner
  if (license.status === "past_due") {
    return (
      <div className="border-b border-amber-500/30 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2.5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm">
              <span className="font-semibold">Payment issue</span>
              <span className="text-muted-foreground"> · Update billing to avoid losing access.</span>
            </p>
          </div>
          <Link
            href="/pricing"
            className="text-xs font-medium text-primary hover:underline"
          >
            Manage billing →
          </Link>
        </div>
      </div>
    );
  }

  // Active paid → no banner
  return null;
}
