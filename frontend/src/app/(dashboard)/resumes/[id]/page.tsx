"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Sparkles,
  MessageSquare,
  FileText,
  Calendar,
  Building2,
  Loader2,
} from "lucide-react";
import type { ResumeDetail } from "@/types/resume";

export default function ResumeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "chunks">("overview");

  const canManage = user?.role === "admin" || user?.role === "hr";

  const fetchResume = useCallback(async () => {
    try {
      const data = await api.get<ResumeDetail>(`/resumes/${params.id}/`, token);
      setResume(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load resume");
    } finally {
      setLoading(false);
    }
  }, [params.id, token]);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  const handleDelete = async () => {
    if (!resume || !confirm(`Delete resume for ${resume.candidate_name}?`))
      return;

    try {
      await api.delete(`/resumes/${resume._id}/delete/`, token);
      toast.success("Resume deleted");
      router.push("/resumes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!resume) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Resume not found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/resumes")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to resumes
          </Button>
        </CardContent>
      </Card>
    );
  }

  const initials = resume.candidate_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sd = resume.structured_data;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/resumes")} className="-ml-2 text-muted-foreground">
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        Back to resumes
      </Button>

      {/* Profile header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 card-elevated">
        <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b from-primary/10 via-primary/5 to-transparent" />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-chart-4 text-xl font-bold text-primary-foreground shadow-lg shadow-primary/25">
                {initials}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{resume.candidate_name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono uppercase">
                    {resume.file_type}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(resume.created_at).toLocaleDateString()}
                  </span>
                  <span>by {resume.uploaded_by}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/chatbot`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat with resume
                </Button>
              </Link>
              <a href={resume.file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Original
                </Button>
              </a>
              {canManage && (
                <Button variant="outline" size="sm" onClick={handleDelete} className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          {sd?.summary && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {sd.summary}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          <Sparkles className="h-3.5 w-3.5" /> Overview
        </TabButton>
        <TabButton active={tab === "chunks"} onClick={() => setTab("chunks")}>
          <FileText className="h-3.5 w-3.5" /> Chunks ({resume.chunks.length})
        </TabButton>
      </div>

      {tab === "overview" ? (
        sd ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Skills */}
            <Section
              icon={Sparkles}
              title="Skills"
              count={sd.skills?.length ?? 0}
              className="lg:col-span-3"
            >
              {sd.skills?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {sd.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyHint />
              )}
            </Section>

            {/* Experience */}
            <Section
              icon={Briefcase}
              title="Experience"
              count={sd.experience?.length ?? 0}
              className="lg:col-span-2"
            >
              {sd.experience?.length ? (
                <ol className="relative space-y-4 border-l border-border/60 pl-4">
                  {sd.experience.map((exp, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-5.25 top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/15" />
                      <p className="text-sm font-semibold">{exp.title || "—"}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {exp.company && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {exp.company}
                          </span>
                        )}
                        {exp.duration && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {exp.duration}
                          </span>
                        )}
                      </div>
                      {exp.description && (
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {exp.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyHint />
              )}
            </Section>

            {/* Education */}
            <Section icon={GraduationCap} title="Education" count={sd.education?.length ?? 0}>
              {sd.education?.length ? (
                <ul className="space-y-3">
                  {sd.education.map((edu, i) => (
                    <li key={i}>
                      <p className="text-sm font-semibold">{edu.degree || "—"}</p>
                      <p className="text-xs text-muted-foreground">{edu.institution}</p>
                      {edu.year && (
                        <p className="text-xs text-muted-foreground">{edu.year}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyHint />
              )}
            </Section>

            {/* Projects */}
            <Section
              icon={FolderGit2}
              title="Projects"
              count={sd.projects?.length ?? 0}
              className="lg:col-span-3"
            >
              {sd.projects?.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {sd.projects.map((p, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="text-sm font-semibold">{p.name}</p>
                      {p.description && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {p.description}
                        </p>
                      )}
                      {p.technologies?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.technologies.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-chart-3/15 px-1.5 py-0.5 text-[10px] font-medium text-chart-3"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyHint />
              )}
            </Section>
          </div>
        ) : (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No structured data yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {canManage
                  ? "Run 'Re-extract Data' from the Search page to extract structured fields."
                  : "Ask HR to re-extract structured data."}
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {resume.chunks.map((chunk) => (
            <div
              key={chunk._id}
              className="rounded-xl border border-border/70 bg-card p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  Chunk {chunk.chunk_index + 1}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ~{chunk.text.split(" ").length} words
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {chunk.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  className = "",
  children,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-border/70 card-elevated p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function EmptyHint() {
  return (
    <p className="text-xs italic text-muted-foreground">No data extracted.</p>
  );
}
