"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  ClipboardList,
  Users,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  total_resumes: number;
  total_interviews: number;
  interviews_completed: number;
  interviews_in_progress: number;
  total_users: number;
  total_chat_sessions: number;
}

interface SkillData {
  skill: string;
  count: number;
}

interface ActivityItem {
  _id: string;
  type: string;
  candidate_name?: string;
  uploaded_by?: string;
  interviewer?: string;
  status?: string;
  created_at: string;
}

interface DashboardResponse {
  stats: DashboardStats;
  skills_distribution: SkillData[];
  hiring_pipeline: { in_progress: number; completed: number };
  recent_activity: ActivityItem[];
}

const PIE_COLORS = ["oklch(0.7 0.16 60)", "oklch(0.68 0.17 162)"];

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<DashboardResponse>(
          "/analytics/dashboard/",
          token
        );
        setData(res);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchStats();
  }, [token]);

  const stats = data?.stats;
  const pipelineData = data
    ? [
        { name: "In Progress", value: data.hiring_pipeline.in_progress },
        { name: "Completed", value: data.hiring_pipeline.completed },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 card-elevated p-6 sm:p-8">
        <div className="absolute inset-0 -z-10 bg-grid-fade opacity-50" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              Overview
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, <span className="text-gradient">{user?.username}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening in your data room today.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/60 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              Search candidates
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/resumes"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"
            >
              <FileText className="h-3.5 w-3.5" />
              Resumes
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Resumes"
          value={stats?.total_resumes ?? 0}
          icon={FileText}
          loading={loading}
          tone="primary"
        />
        <StatCard
          label="Interviews"
          value={stats?.total_interviews ?? 0}
          icon={ClipboardList}
          loading={loading}
          tone="violet"
        />
        <StatCard
          label="Completed"
          value={stats?.interviews_completed ?? 0}
          icon={CheckCircle2}
          loading={loading}
          tone="emerald"
        />
        <StatCard
          label="In Progress"
          value={stats?.interviews_in_progress ?? 0}
          icon={Clock}
          loading={loading}
          tone="amber"
        />
        <StatCard
          label="Users"
          value={stats?.total_users ?? 0}
          icon={Users}
          loading={loading}
          tone="cyan"
        />
        <StatCard
          label="Chats"
          value={stats?.total_chat_sessions ?? 0}
          icon={MessageSquare}
          loading={loading}
          tone="primary"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Skills Distribution</CardTitle>
                <CardDescription>Top skills across all uploaded resumes</CardDescription>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Aggregated
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : data?.skills_distribution && data.skills_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={data.skills_distribution.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <defs>
                    <linearGradient id="skillBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="oklch(0.6 0.21 268)" />
                      <stop offset="100%" stopColor="oklch(0.7 0.16 60)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                  />
                  <YAxis
                    dataKey="skill"
                    type="category"
                    width={90}
                    tick={{ fontSize: 11, fill: "var(--foreground)" }}
                    stroke="var(--border)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    cursor={{ fill: "color-mix(in oklch, var(--primary) 8%, transparent)" }}
                  />
                  <Bar dataKey="count" fill="url(#skillBar)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No skill data yet. Upload resumes to see distribution." />
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Hiring Pipeline</CardTitle>
            <CardDescription>Interview status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : pipelineData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="var(--background)"
                    strokeWidth={3}
                  >
                    {pipelineData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No interviews yet." />
            )}
            {pipelineData.some((d) => d.value > 0) && (
              <div className="mt-3 space-y-2">
                {pipelineData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i] }}
                      />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest uploads and interview sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg shimmer bg-muted/40" />
              ))}
            </div>
          ) : data?.recent_activity && data.recent_activity.length > 0 ? (
            <div className="divide-y divide-border/60">
              {data.recent_activity.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        item.type === "resume_upload"
                          ? "bg-primary/15 text-primary"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {item.type === "resume_upload" ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <ClipboardList className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.candidate_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type === "resume_upload"
                          ? `Uploaded by ${item.uploaded_by}`
                          : `Interview by ${item.interviewer} · ${item.status}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

const TONE_MAP: Record<string, { bg: string; ring: string; text: string }> = {
  primary: { bg: "bg-primary/10", ring: "ring-primary/20", text: "text-primary" },
  emerald: { bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-500/10", ring: "ring-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
  violet: { bg: "bg-chart-4/10", ring: "ring-chart-4/20", text: "text-chart-4" },
  cyan: { bg: "bg-chart-5/10", ring: "ring-chart-5/20", text: "text-chart-5" },
};

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  loading: boolean;
  tone: keyof typeof TONE_MAP;
}) {
  const t = TONE_MAP[tone];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/70 card-elevated p-4 transition-all hover:border-primary/30 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.bg} ${t.text} ring-1 ${t.ring}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight tabular-nums">
          {loading ? <span className="inline-block h-7 w-10 rounded bg-muted shimmer" /> : value}
        </span>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-75 w-full rounded-lg bg-muted/30 shimmer" />;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-75 flex-col items-center justify-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
