"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Target,
  Check,
  X,
  Loader2,
  ArrowUpRight,
  Sparkles,
  GraduationCap,
  Briefcase,
} from "lucide-react";

interface JDRequirements {
  title: string;
  required_skills: string[];
  preferred_skills: string[];
  min_experience_years: number;
  education_requirements: string[];
  key_responsibilities: string[];
}

interface MatchResult {
  document_id: string;
  candidate_name: string;
  fit_score: number;
  required_matched: string[];
  required_missing: string[];
  preferred_matched: string[];
  education_match: boolean;
  experience_count: number;
  all_skills: string[];
  summary: string;
}

interface JDMatchResponse {
  jd_requirements: JDRequirements;
  results: MatchResult[];
  total_candidates: number;
}

function fitTone(score: number) {
  if (score >= 0.7) {
    return {
      ring: "ring-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      label: "Strong fit",
    };
  }
  if (score >= 0.4) {
    return {
      ring: "ring-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      label: "Partial fit",
    };
  }
  return {
    ring: "ring-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    label: "Low fit",
  };
}

export default function JDMatchPage() {
  const { token } = useAuth();
  const [jdText, setJdText] = useState("");
  const [data, setData] = useState<JDMatchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMatch = async () => {
    if (!jdText.trim()) {
      toast.error("Please paste a job description");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<JDMatchResponse>(
        "/analytics/jd-match/",
        { jd_text: jdText.trim(), top_k: 10 },
        token
      );
      setData(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Matching failed");
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
          <Target className="h-3 w-3" />
          Smart Matching
        </div>
        <h1 className="text-3xl font-bold tracking-tight">JD-to-candidate matching</h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Paste a job description, get a ranked shortlist with skill gaps highlighted.
        </p>
      </div>

      {/* JD Input */}
      <div className="rounded-2xl border border-border/70 card-elevated p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Job description</h2>
          <p className="text-xs text-muted-foreground">
            Paste full text or key requirements. AI will extract required/preferred skills.
          </p>
        </div>
        <Textarea
          placeholder="e.g. We're hiring a Senior Frontend Engineer with 5+ years of React, TypeScript, and Node.js experience…"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          className="min-h-40 resize-none font-mono text-sm"
        />
        <Button
          onClick={handleMatch}
          disabled={loading || !jdText.trim()}
          className="mt-3 gap-1.5 shadow-md shadow-primary/15"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          {loading ? "Analyzing…" : "Match candidates"}
        </Button>
      </div>

      {/* Extracted requirements */}
      {data?.jd_requirements && (
        <div className="rounded-2xl border border-primary/30 bg-linear-to-br from-primary/5 to-transparent p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Extracted requirements
                {data.jd_requirements.title && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    — {data.jd_requirements.title}
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">Parsed by AI from your JD</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.jd_requirements.required_skills.length > 0 && (
              <RequirementBlock label="Required" tone="rose" items={data.jd_requirements.required_skills} />
            )}
            {data.jd_requirements.preferred_skills.length > 0 && (
              <RequirementBlock label="Preferred" tone="amber" items={data.jd_requirements.preferred_skills} />
            )}
          </div>

          {(data.jd_requirements.education_requirements.length > 0 ||
            data.jd_requirements.min_experience_years > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {data.jd_requirements.education_requirements.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {data.jd_requirements.education_requirements.join(", ")}
                </span>
              )}
              {data.jd_requirements.min_experience_years > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Min {data.jd_requirements.min_experience_years} yrs
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {data?.results && data.results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{data.total_candidates}</span> candidate
            {data.total_candidates !== 1 ? "s" : ""} evaluated
          </p>

          {data.results.map((result, index) => {
            const tone = fitTone(result.fit_score);
            const pct = (result.fit_score * 100).toFixed(1);

            return (
              <div
                key={result.document_id}
                className="group rounded-2xl border border-border/70 card-elevated p-5 transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      #{index + 1}
                    </span>
                    <div>
                      <Link
                        href={`/resumes/${result.document_id}`}
                        className="flex items-center gap-1 text-base font-semibold hover:text-primary"
                      >
                        {result.candidate_name}
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                      {result.summary && (
                        <p className="mt-0.5 line-clamp-2 max-w-xl text-xs text-muted-foreground">
                          {result.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-background to-muted/60 ring-2 ${tone.ring}`}
                    >
                      <span className="text-sm font-bold tabular-nums">
                        {pct}<span className="text-[10px] text-muted-foreground">%</span>
                      </span>
                    </div>
                    <span className={`mt-1 text-[10px] font-medium uppercase tracking-wider ${tone.text}`}>
                      {tone.label}
                    </span>
                  </div>
                </div>

                {/* Matched / missing */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {result.required_matched.length > 0 && (
                    <MatchBlock
                      icon={Check}
                      label={`Required matched (${result.required_matched.length})`}
                      items={result.required_matched}
                      tone="emerald"
                    />
                  )}
                  {result.required_missing.length > 0 && (
                    <MatchBlock
                      icon={X}
                      label={`Required missing (${result.required_missing.length})`}
                      items={result.required_missing}
                      tone="rose"
                    />
                  )}
                </div>

                {result.preferred_matched.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Preferred matched ({result.preferred_matched.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {result.preferred_matched.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    {result.education_match ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <X className="h-3 w-3 text-rose-500" />
                    )}
                    Education {result.education_match ? "met" : "not met"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {result.experience_count} experience {result.experience_count !== 1 ? "entries" : "entry"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data?.results && data.results.length === 0 && (
        <Card className="card-elevated">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium">No candidates in the system yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Upload some resumes first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const TONE_STYLES = {
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function RequirementBlock({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: keyof typeof TONE_STYLES;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label} ({items.length})
      </p>
      <div className="flex flex-wrap gap-1">
        {items.map((s) => (
          <span key={s} className={`rounded-md px-2 py-0.5 text-xs font-medium ${TONE_STYLES[tone]}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function MatchBlock({
  icon: Icon,
  label,
  items,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  items: string[];
  tone: keyof typeof TONE_STYLES;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {items.map((s) => (
          <span key={s} className={`rounded-md px-2 py-0.5 text-xs font-medium ${TONE_STYLES[tone]}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
