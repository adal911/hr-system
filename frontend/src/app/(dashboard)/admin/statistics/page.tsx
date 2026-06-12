"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Activity,
  Users,
  Eye,
  Zap,
  RefreshCw,
  ServerCog,
  Database,
  Clock,
  ShieldAlert,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrafficPoint {
  hour: string;
  iso: string;
  count: number;
}
interface ActionRow {
  action: string;
  count: number;
}
interface BusyHour {
  hour: string;
  count: number;
}
interface StatsResponse {
  traffic_per_hour: TrafficPoint[];
  visitors: {
    unique_24h: number;
    unique_today: number;
    active_users_24h: number;
    active_users_today: number;
  };
  top_actions: ActionRow[];
  busiest_hours: BusyHour[];
  totals: { requests_24h: number; requests_all_time: number };
  usage_vs_quota: {
    plan: string;
    usage: {
      resumes_this_month: number;
      total_resumes: number;
      users: number;
      interviews: number;
      month_resets: string;
    };
    quotas: {
      users?: number;
      resumes_per_month?: number;
      interviews?: number;
      chatbot_sessions?: number;
    };
  };
}
interface HealthResponse {
  status: string;
  database: string;
  server_time: string;
  uptime_seconds: number;
  last_activity: string | null;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rechecking, setRechecking] = useState(false);

  const isAdmin = user?.role === "admin";

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<StatsResponse>("/monitoring/stats/", token);
      setStats(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadHealth = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<HealthResponse>("/monitoring/health/", token);
      setHealth(data);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadHealth();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadStats, loadHealth]);

  const handleRecheck = async () => {
    setRechecking(true);
    await Promise.all([loadHealth(), loadStats()]);
    setRechecking(false);
    toast.success("Status re-checked");
  };

  if (!isAdmin) {
    return (
      <Card className="card-elevated">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
            <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-lg font-semibold">Admins only</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This statistics dashboard is restricted to company admins.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
            <Activity className="h-3 w-3" />
            Insights
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Traffic, visitors, and usage for your workspace.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecheck}
          disabled={rechecking}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${rechecking ? "animate-spin" : ""}`} />
          Re-check
        </Button>
      </div>

      {/* Health panel */}
      <HealthPanel health={health} />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Eye}
          label="Unique visitors (24h)"
          value={stats?.visitors.unique_24h ?? 0}
          sub={`${stats?.visitors.unique_today ?? 0} today`}
          loading={loading}
          tone="primary"
        />
        <StatCard
          icon={Users}
          label="Active users (24h)"
          value={stats?.visitors.active_users_24h ?? 0}
          sub={`${stats?.visitors.active_users_today ?? 0} today`}
          loading={loading}
          tone="violet"
        />
        <StatCard
          icon={Zap}
          label="Requests (24h)"
          value={stats?.totals.requests_24h ?? 0}
          sub="API calls"
          loading={loading}
          tone="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="All-time requests"
          value={stats?.totals.requests_all_time ?? 0}
          sub="since launch"
          loading={loading}
          tone="emerald"
        />
      </div>

      {/* Traffic per hour */}
      <div className="rounded-2xl border border-border/70 card-elevated p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Traffic — last 24 hours</h2>
            <p className="text-xs text-muted-foreground">API requests bucketed by hour</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3 w-3" />
            Per hour
          </div>
        </div>
        {loading ? (
          <div className="h-72 rounded-lg bg-muted/30 shimmer" />
        ) : (
          <ResponsiveContainer width="100%" height={288}>
            <AreaChart data={stats?.traffic_per_hour ?? []} margin={{ left: -16, right: 8 }}>
              <defs>
                <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.6 0.21 268)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.6 0.21 268)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="var(--muted-foreground)"
                fontSize={10}
                interval={2}
                tickLine={false}
              />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} width={32} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="oklch(0.6 0.21 268)"
                strokeWidth={2}
                fill="url(#trafficFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top actions + busiest hours */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 card-elevated p-6">
          <h2 className="text-base font-semibold">Top actions (24h)</h2>
          <p className="text-xs text-muted-foreground">Most-used features</p>
          {loading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-muted/30 shimmer" />
              ))}
            </div>
          ) : stats && stats.top_actions.length > 0 ? (
            <div className="mt-4 space-y-2">
              {stats.top_actions.map((a, i) => {
                const max = stats.top_actions[0].count || 1;
                const pct = Math.round((a.count / max) * 100);
                return (
                  <div key={a.action} className="relative overflow-hidden rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/10"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-medium">{a.action}</span>
                      </span>
                      <span className="font-semibold tabular-nums">{a.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyHint label="No activity recorded yet." />
          )}
        </div>

        <div className="rounded-2xl border border-border/70 card-elevated p-6">
          <h2 className="text-base font-semibold">Busiest hours</h2>
          <p className="text-xs text-muted-foreground">Activity by hour of day (last 7 days)</p>
          {loading ? (
            <div className="mt-4 h-56 rounded-lg bg-muted/30 shimmer" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={stats?.busiest_hours ?? []} margin={{ left: -20, right: 8, top: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={9} interval={3} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} width={28} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "color-mix(in oklch, var(--primary) 8%, transparent)" }}
                />
                <Bar dataKey="count" fill="oklch(0.68 0.17 162)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Usage vs quota */}
      {stats?.usage_vs_quota && <UsagePanel data={stats.usage_vs_quota} />}
    </div>
  );
}

// ─── Health panel ────────────────────────────────────────────────────────────

function HealthPanel({ health }: { health: HealthResponse | null }) {
  const online = health?.status === "online";
  const dbOk = health?.database === "connected";

  const uptime = health ? formatUptime(health.uptime_seconds) : "—";
  const serverTime = health ? new Date(health.server_time).toLocaleTimeString() : "—";
  const lastActivity = health?.last_activity
    ? new Date(health.last_activity).toLocaleString()
    : "No activity yet";

  return (
    <div className="rounded-2xl border border-border/70 card-elevated p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              online
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
            }`}
          >
            <ServerCog className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">System status</h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                  online
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                }`}
              >
                {online ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {health?.status ?? "checking…"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Read-only health overview</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HealthItem
          icon={Database}
          label="Database"
          value={dbOk ? "Connected" : "Unreachable"}
          tone={dbOk ? "ok" : "bad"}
        />
        <HealthItem icon={Clock} label="Server time" value={serverTime} />
        <HealthItem icon={Activity} label="Uptime" value={uptime} />
        <HealthItem icon={Eye} label="Last activity" value={lastActivity} />
      </div>
    </div>
  );
}

function HealthItem({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  const valueColor =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
      ? "text-rose-600 dark:text-rose-400"
      : "text-foreground";
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={`mt-1 truncate text-sm font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}

// ─── Usage panel ─────────────────────────────────────────────────────────────

function UsagePanel({ data }: { data: NonNullable<StatsResponse["usage_vs_quota"]> }) {
  const rows = [
    { label: "Resumes this month", used: data.usage.resumes_this_month, limit: data.quotas.resumes_per_month ?? -1 },
    { label: "Users", used: data.usage.users, limit: data.quotas.users ?? -1 },
  ];

  return (
    <div className="rounded-2xl border border-border/70 card-elevated p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Usage vs plan quota</h2>
          <p className="text-xs text-muted-foreground">
            {data.plan} plan · resets {data.usage.month_resets || "monthly"}
          </p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
          {data.plan}
        </span>
      </div>

      <div className="space-y-4">
        {rows.map((r) => {
          const unlimited = r.limit === -1;
          const pct = unlimited ? 0 : Math.min(100, Math.round((r.used / Math.max(r.limit, 1)) * 100));
          const near = !unlimited && pct >= 80;
          return (
            <div key={r.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{r.used}</span>
                  {" / "}
                  {unlimited ? "∞" : r.limit}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    unlimited
                      ? "bg-emerald-500/60"
                      : near
                      ? "bg-linear-to-r from-amber-500 to-rose-500"
                      : "bg-linear-to-r from-primary to-chart-4"
                  }`}
                  style={{ width: unlimited ? "100%" : `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bits ────────────────────────────────────────────────────────────────────

const TONE_MAP: Record<string, { bg: string; ring: string; text: string }> = {
  primary: { bg: "bg-primary/10", ring: "ring-primary/20", text: "text-primary" },
  emerald: { bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-500/10", ring: "ring-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
  violet: { bg: "bg-chart-4/10", ring: "ring-chart-4/20", text: "text-chart-4" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub: string;
  loading: boolean;
  tone: keyof typeof TONE_MAP;
}) {
  const t = TONE_MAP[tone];
  return (
    <div className="rounded-xl border border-border/70 card-elevated p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.bg} ${t.text} ring-1 ${t.ring}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">
        {loading ? <span className="inline-block h-7 w-12 rounded bg-muted shimmer" /> : value.toLocaleString()}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 py-10 text-center">
      <Activity className="mb-2 h-6 w-6 text-muted-foreground/50" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
