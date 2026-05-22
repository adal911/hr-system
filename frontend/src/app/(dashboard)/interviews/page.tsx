"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ClipboardList,
  Plus,
  Trash2,
  Loader2,
  X,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import type { InterviewListItem } from "@/types/interview";
import type { Resume } from "@/types/resume";

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [selectedResume, setSelectedResume] = useState("");
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed">("all");
  const { user, token } = useAuth();

  const canManage = user?.role === "admin" || user?.role === "hr";

  const fetchInterviews = useCallback(async () => {
    try {
      const data = await api.get<InterviewListItem[]>("/interviews/", token);
      setInterviews(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchResumes = useCallback(async () => {
    try {
      const data = await api.get<Resume[]>("/resumes/", token);
      setResumes(data);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    fetchInterviews();
    fetchResumes();
  }, [fetchInterviews, fetchResumes]);

  const handleCreate = async () => {
    const name = candidateName.trim();
    if (!name) {
      toast.error("Candidate name is required");
      return;
    }

    setCreating(true);
    try {
      await api.post(
        "/interviews/",
        { candidate_name: name, document_id: selectedResume || "" },
        token
      );
      toast.success("Interview created");
      setCandidateName("");
      setSelectedResume("");
      setShowCreate(false);
      fetchInterviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create interview");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete interview for ${name}?`)) return;
    try {
      await api.delete(`/interviews/${id}/`, token);
      toast.success("Interview deleted");
      fetchInterviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleResumeSelect = (resumeId: string) => {
    setSelectedResume(resumeId);
    const resume = resumes.find((r) => r._id === resumeId);
    if (resume) setCandidateName(resume.candidate_name);
  };

  const counts = {
    all: interviews.length,
    in_progress: interviews.filter((i) => i.status === "in_progress").length,
    completed: interviews.filter((i) => i.status === "completed").length,
  };

  const filtered = interviews.filter((i) => filter === "all" || i.status === filter);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
            <ClipboardList className="h-3 w-3" />
            Sessions
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage structured interview sessions and AI-assisted Q&A.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="gap-1.5 shadow-md shadow-primary/15"
          >
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? "Cancel" : "New Interview"}
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/30 p-1">
        <FilterTab active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>
          All
        </FilterTab>
        <FilterTab
          active={filter === "in_progress"}
          onClick={() => setFilter("in_progress")}
          count={counts.in_progress}
          tone="amber"
        >
          <Clock className="h-3 w-3" /> In Progress
        </FilterTab>
        <FilterTab
          active={filter === "completed"}
          onClick={() => setFilter("completed")}
          count={counts.completed}
          tone="emerald"
        >
          <CheckCircle2 className="h-3 w-3" /> Completed
        </FilterTab>
      </div>

      {/* Create form */}
      {showCreate && canManage && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border border-border/70 card-elevated p-6">
          <h2 className="mb-1 text-base font-semibold">Create interview session</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Pick a resume (links the candidate for AI-assisted answers) or enter a name manually.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {resumes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Linked resume (optional)
                </Label>
                <Select value={selectedResume} onValueChange={handleResumeSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a candidate's resume…" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((r) => (
                      <SelectItem key={r._id} value={r._id}>
                        {r.candidate_name} ({r.file_type.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Candidate name
              </Label>
              <Input
                placeholder="e.g. Ada Lovelace"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={creating || !candidateName.trim()}
            className="mt-4 gap-1.5 shadow-md shadow-primary/15"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create interview
          </Button>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-muted/40 shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-semibold">No interviews here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "all"
                ? canManage ? "Start your first interview." : "No interviews scheduled yet."
                : `No ${filter.replace("_", " ")} interviews.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((interview) => {
            const isCompleted = interview.status === "completed";
            const initials = interview.candidate_name
              .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

            return (
              <div
                key={interview._id}
                className="group relative overflow-hidden rounded-xl border border-border/70 card-elevated p-5 transition-all hover:border-primary/30 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold shadow-md ${
                      isCompleted
                        ? "bg-linear-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/20"
                        : "bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/20"
                    }`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/interviews/${interview._id}`}
                        className="flex items-center gap-1 text-base font-semibold tracking-tight hover:text-primary"
                      >
                        <span className="truncate">{interview.candidate_name}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <UserIcon className="h-3 w-3" />
                        {interview.interviewer}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      isCompleted
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {isCompleted ? "Done" : "Active"}
                  </span>
                </div>

                <div className="my-4 h-px bg-border/60" />

                <div className="flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(interview.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                  <div className="flex gap-1">
                    <Link href={`/interviews/${interview._id}`}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        {isCompleted ? "View" : "Continue"}
                      </Button>
                    </Link>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(interview._id, interview.candidate_name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  count,
  children,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
  tone?: "amber" | "emerald";
}) {
  const activeBg =
    tone === "amber"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "bg-background text-foreground shadow-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
        active ? activeBg : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
        active ? "bg-foreground/10" : "bg-muted/60"
      }`}>
        {count}
      </span>
    </button>
  );
}
