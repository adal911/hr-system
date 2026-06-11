"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { PlanMeta, PlanId } from "@/types/auth";

interface PlansResponse {
  plans: PlanMeta[];
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanMeta[] | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState<PlanId | null>(null);
  const { user, token, license } = useAuth();

  useEffect(() => {
    let cancelled = false;
    api
      .get<PlansResponse>("/billing/plans/")
      .then((res) => !cancelled && setPlans(res.plans))
      .catch(() => !cancelled && setPlans([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // Show feedback if the user came back from a cancelled checkout
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") === "cancelled") {
      toast.info("Checkout cancelled — no charge was made.");
    }
  }, []);

  const isAuthed = !!(user && token);
  const isAdmin = user?.role === "admin";
  const currentPlanId = license?.plan;

  const handleUpgrade = async (planId: PlanId) => {
    if (!isAuthed) {
      // Not signed in → go signup flow with the chosen plan
      window.location.href = `/signup?plan=${planId}`;
      return;
    }
    if (!isAdmin) {
      toast.error("Only company admins can manage billing.");
      return;
    }

    setUpgradingPlan(planId);
    try {
      const data = await api.post<{ url: string }>(
        "/billing/checkout/",
        { plan_id: planId },
        token
      );
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
      setUpgradingPlan(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <section className="relative overflow-hidden bg-aurora">
        <div className="absolute inset-0 bg-grid-fade opacity-50" />
        <div className="relative mx-auto max-w-3xl px-6 pb-12 pt-20 text-center sm:pt-24">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Plans that grow with your team.
          </h1>
          <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
            Start with a 14-day Pro trial — no credit card required. Upgrade, downgrade, or cancel anytime.
          </p>
          {isAuthed && license && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              You&apos;re on{" "}
              <span className="font-semibold text-foreground">
                {license.plan_meta?.name || "Trial"}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{license.status}</span>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-8 sm:pb-28">
        {plans === null ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-120 rounded-2xl bg-muted/40 shimmer" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Could not load pricing. Please try again later.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onUpgrade={() => handleUpgrade(plan.id)}
                upgrading={upgradingPlan === plan.id}
                upgradeDisabled={upgradingPlan !== null}
                isCurrent={isAuthed && currentPlanId === plan.id && (license?.status === "active")}
                isAuthed={isAuthed}
              />
            ))}
          </div>
        )}

        {/* Comparison strip */}
        <div className="mt-16 rounded-2xl border border-border/70 card-elevated p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Compare plans</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Side-by-side limits across every tier.
          </p>
          {plans && plans.length > 0 && <ComparisonTable plans={plans} />}
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-center text-2xl font-bold tracking-tight">Frequently asked</h2>
          <div className="mx-auto mt-8 grid max-w-3xl gap-4">
            <Faq
              q="Do I need a credit card to start the trial?"
              a="No. Sign up with just an email and password — you get full Pro access for 14 days. We'll prompt for billing only if you upgrade."
            />
            <Faq
              q="What happens when my trial ends?"
              a="You'll be moved to read-only access. You can still log in and view your data, but uploading new resumes, starting interviews, and using the chatbot require an active plan."
            />
            <Faq
              q="Can I switch plans later?"
              a="Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period."
            />
            <Faq
              q="Is my data isolated from other companies?"
              a="Yes. Each company has its own tenant scope. Your resumes, interviews, and chats are never visible to other organizations."
            />
            <Faq
              q="Can I test the payment flow without spending money?"
              a="Yes — we use Stripe test mode. Pay with card 4242 4242 4242 4242, any future expiry, any CVC. It's a real-looking flow but no charge is made."
            />
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

// ─── Plan card ──────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onUpgrade,
  upgrading,
  upgradeDisabled,
  isCurrent,
  isAuthed,
}: {
  plan: PlanMeta;
  onUpgrade: () => void;
  upgrading: boolean;
  upgradeDisabled: boolean;
  isCurrent: boolean;
  isAuthed: boolean;
}) {
  let buttonLabel = isAuthed ? `Upgrade to ${plan.name}` : "Start free trial";
  if (isCurrent) buttonLabel = "Current plan";

  return (
    <div
      className={`relative rounded-2xl border p-6 transition-all ${
        plan.highlight
          ? "border-primary/40 bg-linear-to-br from-primary/5 via-card to-card ring-1 ring-primary/30 ring-glow"
          : "border-border/70 bg-card"
      } ${isCurrent ? "ring-2 ring-emerald-500/40" : ""}`}
    >
      {plan.highlight && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-linear-to-r from-primary to-chart-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-md shadow-primary/25">
            Most popular
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md shadow-emerald-500/25">
            Your plan
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
      </div>

      <div className="mb-6 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight">${plan.price_monthly_usd}</span>
        <span className="text-sm text-muted-foreground">/ month</span>
      </div>

      <Button
        onClick={onUpgrade}
        disabled={upgradeDisabled || isCurrent}
        className={`w-full gap-1.5 ${plan.highlight ? "shadow-md shadow-primary/20" : ""}`}
        variant={plan.highlight ? "default" : "outline"}
      >
        {upgrading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            {buttonLabel}
            {!isCurrent && <ArrowRight className="h-3.5 w-3.5" />}
          </>
        )}
      </Button>

      <div className="mt-6 space-y-2.5">
        {plan.features.map((f) => (
          <div key={f} className="flex items-start gap-2.5">
            <div
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                plan.highlight ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
              }`}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </div>
            <p className="text-sm leading-relaxed">{f}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Comparison table ──────────────────────────────────────────────────────

function ComparisonTable({ plans }: { plans: PlanMeta[] }) {
  const rows: Array<{ key: keyof PlanMeta["quotas"]; label: string }> = [
    { key: "users", label: "Users" },
    { key: "resumes_per_month", label: "Resumes / month" },
    { key: "interviews", label: "Interviews" },
    { key: "chatbot_sessions", label: "Chatbot sessions" },
  ];

  const fmt = (n: number) => (n === -1 ? "Unlimited" : n.toLocaleString());

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left">
            <th className="py-3 pr-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Feature
            </th>
            {plans.map((p) => (
              <th
                key={p.id}
                className={`py-3 pr-4 text-xs font-medium uppercase tracking-wider ${
                  p.highlight ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border/30 last:border-0">
              <td className="py-3 pr-4 font-medium text-muted-foreground">{row.label}</td>
              {plans.map((p) => (
                <td key={p.id} className="py-3 pr-4 font-semibold tabular-nums">
                  {fmt(p.quotas[row.key])}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="py-3 pr-4 font-medium text-muted-foreground">Price</td>
            {plans.map((p) => (
              <td key={p.id} className="py-3 pr-4 font-semibold">
                ${p.price_monthly_usd}/mo
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-border/70 bg-card p-4 open:border-primary/30">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
        <span>{q}</span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
    </details>
  );
}

