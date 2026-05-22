"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  GitCompare,
  Check,
  Plus,
  Loader2,
  Briefcase,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface Resume {
  _id: string;
  candidate_name: string;
}

interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

interface Education {
  degree: string;
  institution: string;
  year: string;
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
}

interface CandidateComparison {
  document_id: string;
  candidate_name: string;
  summary: string;
  skills: string[];
  unique_skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  experience_years: number;
}

interface ComparisonResponse {
  candidates: CandidateComparison[];
  common_skills: string[];
  total_common: number;
}

export default function ComparePage() {
  const { token } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingResumes, setLoadingResumes] = useState(true);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const data = await api.get<Resume[]>("/resumes/", token);
        setResumes(data);
      } catch {
        toast.error("Failed to load resumes");
      } finally {
        setLoadingResumes(false);
      }
    };
    if (token) fetchResumes();
  }, [token]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 5
          ? [...prev, id]
          : prev
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast.error("Select at least 2 resumes to compare");
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<ComparisonResponse>(
        "/analytics/compare/",
        { document_ids: selectedIds },
        token
      );
      setComparison(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 card-elevated p-6 sm:p-8">
        <div className="absolute inset-0 -z-10 bg-grid-fade opacity-50" />
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
          <GitCompare className="h-3 w-3" />
          Side-by-Side
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Compare candidates
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Pick 2–5 candidates to surface common ground, unique strengths, and skill gaps.
        </p>
      </div>

      {/* Selection */}
      <div className="rounded-2xl border border-border/70 card-elevated p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Select candidates</h2>
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} / 5 selected
            </p>
          </div>
          <Button
            onClick={handleCompare}
            disabled={loading || selectedIds.length < 2}
            className="gap-1.5 shadow-md shadow-primary/15"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
            Compare
          </Button>
        </div>

        {loadingResumes ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : resumes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No resumes available to compare.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {resumes.map((r) => {
              const selected = selectedIds.includes(r._id);
              return (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => toggleSelection(r._id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  {selected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {r.candidate_name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results */}
      {comparison && (
        <>
          {/* Common skills banner */}
          <div className="rounded-2xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/5 to-transparent p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  Common skills ({comparison.total_common})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Shared across all {comparison.candidates.length} candidates
                </p>
              </div>
            </div>
            {comparison.common_skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {comparison.common_skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No common skills found.</p>
            )}
          </div>

          {/* Side by side */}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {comparison.candidates.map((candidate) => {
              const initials = candidate.candidate_name
                .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div
                  key={candidate.document_id}
                  className="overflow-hidden rounded-xl border border-border/70 card-elevated"
                >
                  <div className="border-b border-border/60 bg-linear-to-br from-primary/5 to-transparent p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-chart-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20">
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{candidate.candidate_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {candidate.experience_years} experience {candidate.experience_years !== 1 ? "entries" : "entry"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    {candidate.summary && (
                      <div>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Summary
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {candidate.summary}
                        </p>
                      </div>
                    )}

                    {candidate.unique_skills.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Unique strengths
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.unique_skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        All skills ({candidate.skills.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 15).map((skill) => {
                          const isCommon = comparison.common_skills.includes(skill);
                          const isUnique = candidate.unique_skills.includes(skill);
                          return (
                            <span
                              key={skill}
                              className={`rounded-md px-1.5 py-0.5 text-[11px] ${
                                isCommon
                                  ? "bg-emerald-500/15 font-medium text-emerald-700 dark:text-emerald-300"
                                  : isUnique
                                  ? "bg-primary/10 font-medium text-primary"
                                  : "bg-muted/60 text-muted-foreground"
                              }`}
                            >
                              {skill}
                            </span>
                          );
                        })}
                        {candidate.skills.length > 15 && (
                          <span className="rounded-md bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            +{candidate.skills.length - 15}
                          </span>
                        )}
                      </div>
                    </div>

                    {candidate.experience.length > 0 && (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Briefcase className="h-3 w-3" /> Experience
                        </p>
                        <div className="space-y-2">
                          {candidate.experience.slice(0, 3).map((exp, i) => (
                            <div key={i} className="border-l-2 border-primary/30 pl-3">
                              <p className="text-xs font-semibold">{exp.title}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {exp.company}
                                {exp.duration && ` · ${exp.duration}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {candidate.education.length > 0 && (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <GraduationCap className="h-3 w-3" /> Education
                        </p>
                        {candidate.education.slice(0, 2).map((edu, i) => (
                          <div key={i} className="mb-1">
                            <p className="text-xs font-semibold">{edu.degree}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {edu.institution}
                              {edu.year && ` · ${edu.year}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!comparison && (
        <Card className="card-elevated">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <GitCompare className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium">No comparison yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Select at least 2 candidates above and click Compare.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
