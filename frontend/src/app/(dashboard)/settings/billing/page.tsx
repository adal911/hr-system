"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  CreditCard,
  Sparkles,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import type { LicenseStatus } from "@/types/auth";

const STATUS_META: Record<
  LicenseStatus,
  { label: string; tone: string; icon: React.ElementType }
> = {
  trialing: { label: "In trial", tone: "text-primary bg-primary/10", icon: Clock },
  active: { label: "Active", tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10", icon: CheckCircle2 },
  past_due: { label: "Past due", tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10", icon: AlertTriangle },
  cancelled: { label: "Cancelled", tone: "text-muted-foreground bg-muted/60", icon: AlertTriangle },
  incomplete: { label: "Incomplete", tone: "text-muted-foreground bg-muted/60", icon: AlertTriangle },
  expired: { label: "Expired", tone: "text-rose-600 dark:text-rose-400 bg-rose-500/10", icon: AlertTriangle },
  missing: { label: "No license", tone: "text-muted-foreground bg-muted/60", icon: AlertTriangle },
};

export default function BillingSettingsPage() {
  const { user, token, license, company, refreshLicense } = useAuth();
  const [opening, setOpening] = useState(false);

  const isAdmin = user?.role === "admin";

  const status: LicenseStatus = license?.status ?? "missing";
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const plan = license?.plan_meta;

  const handleOpenPortal = async () => {
    if (!isAdmin) {
      toast.error("Only company admins can manage billing.");
      return;
    }
    setOpening(true);
    try {
      const data = await api.post<{ url: string }>("/billing/portal/", {}, token);
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open billing portal");
      setOpening(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
            <CreditCard className="h-3 w-3" />
            Billing
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Plan & billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your subscription, view invoices, and update payment method.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshLicense()}
          className="gap-1.5"
        >
          Refresh
        </Button>
      </div>

      {/* Current plan card */}
      <div className="overflow-hidden rounded-2xl border border-border/70 card-elevated">
        <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b from-primary/10 via-primary/5 to-transparent" />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-chart-4 text-primary-foreground shadow-lg shadow-primary/25">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Current plan
                </p>
                <h2 className="mt-0.5 text-2xl font-bold tracking-tight">
                  {plan?.name || "Free trial"}
                </h2>
                {plan && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    ${plan.price_monthly_usd}/month · {plan.tagline}
                  </p>
                )}
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.tone}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {meta.label}
            </span>
          </div>

          {/* Trial / period info */}
          {license && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {license.is_trial && (
                <InfoBlock
                  icon={Clock}
                  label="Trial ends in"
                  value={`${license.days_remaining} day${license.days_remaining !== 1 ? "s" : ""}`}
                />
              )}
              {!license.is_trial && license.is_active && (
                <InfoBlock
                  icon={Calendar}
                  label="Next renewal in"
                  value={`${license.days_remaining} day${license.days_remaining !== 1 ? "s" : ""}`}
                />
              )}
              {company && (
                <InfoBlock icon={Building2} label="Company" value={company.name} />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            {(license?.is_trial || license?.status === "expired") && (
              <Link href="/pricing">
                <Button className="gap-1.5 shadow-md shadow-primary/15">
                  <Sparkles className="h-4 w-4" />
                  Upgrade plan
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            {!license?.is_trial && license?.is_active && (
              <Link href="/pricing">
                <Button variant="outline" className="gap-1.5">
                  Change plan
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            <Button
              onClick={handleOpenPortal}
              disabled={opening || !isAdmin}
              variant="outline"
              className="gap-1.5"
            >
              {opening ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage in Stripe Portal
            </Button>
          </div>

          {!isAdmin && (
            <p className="mt-3 text-xs text-muted-foreground">
              Only the company admin can modify billing. Ask your admin to make changes.
            </p>
          )}
        </div>
      </div>

      {/* Plan limits */}
      {plan && (
        <div className="rounded-2xl border border-border/70 card-elevated p-6">
          <h2 className="text-base font-semibold">Plan limits</h2>
          <p className="text-xs text-muted-foreground">
            What&apos;s included in {plan.name}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LimitCard label="Users" value={plan.quotas.users} />
            <LimitCard label="Resumes / month" value={plan.quotas.resumes_per_month} />
            <LimitCard label="Interviews" value={plan.quotas.interviews} />
            <LimitCard label="Chatbot sessions" value={plan.quotas.chatbot_sessions} />
          </div>
        </div>
      )}

      {/* Help */}
      <Card className="card-elevated">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-semibold">Need help with billing?</p>
            <p className="text-xs text-muted-foreground">
              Test card for demos: <span className="font-mono">4242 4242 4242 4242</span> · any future date · any CVC.
            </p>
          </div>
          <Link href="/pricing" className="text-xs font-medium text-primary hover:underline">
            View pricing →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function LimitCard({ label, value }: { label: string; value: number }) {
  const display = value === -1 ? "Unlimited" : value.toLocaleString();
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{display}</p>
    </div>
  );
}
