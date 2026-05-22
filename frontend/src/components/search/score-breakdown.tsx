"use client";

import { Briefcase, GraduationCap, FolderGit2, FileText, Sparkles, Zap } from "lucide-react";

interface SectionScore {
  weight: number;
  raw_score: number;
  contribution: number;
}

export interface ScoreBreakdown {
  skills: SectionScore;
  experience: SectionScore;
  projects: SectionScore;
  education: SectionScore;
  summary: SectionScore;
  token_coverage: number;
  matched_tokens: number;
  total_tokens: number;
  query_tokens: string[];
  vector_score?: number;
  semantic_only?: boolean;
}

interface Props {
  breakdown: ScoreBreakdown;
  finalScore: number;
}

const SECTION_META = [
  { key: "skills", label: "Skills", icon: Sparkles, color: "from-primary to-chart-5" },
  { key: "experience", label: "Experience", icon: Briefcase, color: "from-chart-2 to-emerald-400" },
  { key: "projects", label: "Projects", icon: FolderGit2, color: "from-chart-3 to-amber-400" },
  { key: "education", label: "Education", icon: GraduationCap, color: "from-chart-4 to-pink-400" },
  { key: "summary", label: "Summary", icon: FileText, color: "from-chart-5 to-cyan-400" },
] as const;

export function ScoreBreakdownPanel({ breakdown, finalScore }: Props) {
  const sections = SECTION_META.map((meta) => ({
    ...meta,
    score: breakdown[meta.key as keyof ScoreBreakdown] as SectionScore,
  }));

  const coveragePct = Math.round(breakdown.token_coverage * 100);

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Why this score?</p>
            <p className="text-[11px] text-muted-foreground">
              Breakdown of how the {(finalScore * 100).toFixed(1)}% match was computed
            </p>
          </div>
        </div>
        {breakdown.semantic_only ? (
          <span className="rounded-full bg-chart-4/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-chart-4">
            Semantic Match
          </span>
        ) : (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
            Keyword + Vector
          </span>
        )}
      </div>

      {/* Token coverage strip */}
      <div className="rounded-lg border border-border/70 bg-background/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Query coverage
          </p>
          <p className="text-xs font-semibold">
            <span className="text-foreground">{breakdown.matched_tokens}</span>
            <span className="text-muted-foreground"> / {breakdown.total_tokens} terms</span>
            <span className="ml-1.5 text-primary">({coveragePct}%)</span>
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="score-bar-segment h-full rounded-full bg-linear-to-r from-primary to-chart-4"
            style={{ width: `${coveragePct}%` }}
          />
        </div>
        {breakdown.query_tokens.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {breakdown.query_tokens.map((token) => (
              <span
                key={token}
                className="rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {token}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Per-section contributions */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium text-muted-foreground">
          Section contributions
        </p>
        {breakdown.semantic_only ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              Matched semantically via vector search.
              {typeof breakdown.vector_score === "number" && (
                <>
                  {" "}Raw vector similarity:{" "}
                  <span className="font-mono text-foreground">
                    {breakdown.vector_score.toFixed(3)}
                  </span>
                </>
              )}
            </p>
          </div>
        ) : (
          sections.map(({ key, label, icon: Icon, color, score }) => {
            const pct = Math.round(score.contribution * 100);
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/70">
                      ×{score.weight.toFixed(1)}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums">{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`score-bar-segment h-full rounded-full bg-linear-to-r ${color}`}
                    style={{ width: pct > 0 ? `${Math.max(pct, 2)}%` : "0%" }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Formula hint */}
      <p className="border-t border-border/50 pt-3 text-[10px] leading-relaxed text-muted-foreground">
        <span className="font-medium">Formula:</span> 60% × query coverage +
        40% × weighted section score. Section weights: Skills 1.0, Experience 0.8,
        Projects 0.6, Education 0.5, Summary 0.2.
      </p>
    </div>
  );
}
