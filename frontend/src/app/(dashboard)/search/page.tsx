"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ScoreBreakdownPanel,
  type ScoreBreakdown,
} from "@/components/search/score-breakdown";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  RotateCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Briefcase,
  GraduationCap,
  FolderGit2,
  ArrowUpRight,
} from "lucide-react";

interface SearchResult {
  document_id: string;
  candidate_name: string;
  score: number;
  matched_skills: string[];
  matched_experience: string[];
  matched_education: string[];
  matched_projects: string[];
  all_skills: string[];
  summary: string;
  search_type?: string;
  score_breakdown?: ScoreBreakdown;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
  search_type: string;
}

const EXAMPLE_QUERIES = [
  "Python, React, TypeScript",
  "Engineers who built recommendation engines at scale",
  "Senior backend with Go and Kubernetes",
  "Data scientists with NLP experience",
];

function scoreTone(score: number) {
  if (score >= 0.7) return { label: "Strong match", color: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/30" };
  if (score >= 0.4) return { label: "Moderate", color: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/30" };
  return { label: "Weak", color: "text-muted-foreground", ring: "ring-muted" };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [reextracting, setReextracting] = useState(false);
  const [searchType, setSearchType] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { user, token } = useAuth();

  const canManage = user?.role === "admin" || user?.role === "hr";

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await api.get<SearchResponse>(
        `/search/?q=${encodeURIComponent(q.trim())}&top_k=10`,
        token
      );
      setResults(data.results);
      setSearchType(data.search_type);
      setSearched(true);
      setExpanded({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleExample = (q: string) => {
    setQuery(q);
    runSearch(q);
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      const data = await api.post<{ message: string }>("/search/rebuild/", {}, token);
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rebuild failed");
    } finally {
      setRebuilding(false);
    }
  };

  const handleReextract = async () => {
    setReextracting(true);
    try {
      const data = await api.post<{ message: string }>("/resumes/reextract/", {}, token);
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-extraction failed");
    } finally {
      setReextracting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 card-elevated p-6 sm:p-8">
        <div className="absolute inset-0 -z-10 bg-grid-fade opacity-60" />
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                Hybrid Retrieval
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Find the right candidate, fast.
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                Keyword + semantic vector search across every resume. Ask in plain English
                or paste a list of skills.
              </p>
            </div>
            {canManage && (
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={handleReextract} disabled={reextracting}>
                  <RotateCw className={`mr-1.5 h-3.5 w-3.5 ${reextracting ? "animate-spin" : ""}`} />
                  Re-extract
                </Button>
                <Button variant="outline" size="sm" onClick={handleRebuild} disabled={rebuilding}>
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${rebuilding ? "animate-spin" : ""}`} />
                  Rebuild Index
                </Button>
              </div>
            )}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="group relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Search skills, experience, or describe the candidate you want…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 rounded-xl border-border/80 bg-background/80 pl-11 pr-4 text-base shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-12 gap-1.5 rounded-xl px-5 shadow-md shadow-primary/15"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </form>

          {/* Example chips */}
          {!searched && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Try:</span>
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleExample(ex)}
                  className="rounded-full border border-border/80 bg-background/60 px-3 py-1 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {searched && results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">No matching candidates</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try different keywords, or {canManage ? "re-extract structured data." : "ask HR to re-extract data."}
            </p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{results.length}</span> candidate
              {results.length !== 1 ? "s" : ""} found
            </p>
            {searchType && (
              <span className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {searchType} search
              </span>
            )}
          </div>

          {results.map((result, idx) => {
            const tone = scoreTone(result.score);
            const pct = (result.score * 100).toFixed(1);
            const isOpen = expanded[result.document_id] ?? false;

            return (
              <div
                key={result.document_id}
                className="group relative overflow-hidden rounded-2xl border border-border/70 card-elevated transition-all hover:border-primary/30"
              >
                {/* Rank indicator */}
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-linear-to-b from-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <Link
                          href={`/resumes/${result.document_id}`}
                          className="flex items-center gap-1 text-lg font-semibold tracking-tight hover:text-primary"
                        >
                          {result.candidate_name}
                          <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </div>
                      {result.summary && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                          {result.summary}
                        </p>
                      )}
                    </div>

                    {/* Score ring */}
                    <div className="flex shrink-0 flex-col items-end">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-background to-muted/60 ring-2 ${tone.ring}`}
                      >
                        <span className="text-sm font-bold tabular-nums">{pct}<span className="text-[10px] text-muted-foreground">%</span></span>
                      </div>
                      <span className={`mt-1 text-[10px] font-medium uppercase tracking-wider ${tone.color}`}>
                        {tone.label}
                      </span>
                    </div>
                  </div>

                  {/* Matched evidence */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {result.matched_skills.length > 0 && (
                      <EvidenceBlock
                        icon={Sparkles}
                        label="Matched skills"
                        items={result.matched_skills}
                        tone="indigo"
                      />
                    )}
                    {result.matched_experience?.length > 0 && (
                      <EvidenceBlock
                        icon={Briefcase}
                        label="Matched experience"
                        items={result.matched_experience}
                        tone="emerald"
                      />
                    )}
                    {result.matched_education?.length > 0 && (
                      <EvidenceBlock
                        icon={GraduationCap}
                        label="Matched education"
                        items={result.matched_education}
                        tone="violet"
                      />
                    )}
                    {result.matched_projects?.length > 0 && (
                      <EvidenceBlock
                        icon={FolderGit2}
                        label="Matched projects"
                        items={result.matched_projects}
                        tone="amber"
                      />
                    )}
                  </div>

                  {/* All skills */}
                  {result.all_skills.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        All skills
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {result.all_skills.slice(0, 18).map((skill) => {
                          const matched = result.matched_skills.includes(skill);
                          return (
                            <span
                              key={skill}
                              className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                                matched
                                  ? "bg-primary/15 font-medium text-primary"
                                  : "bg-muted/60 text-muted-foreground"
                              }`}
                            >
                              {skill}
                            </span>
                          );
                        })}
                        {result.all_skills.length > 18 && (
                          <span className="rounded-md bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                            +{result.all_skills.length - 18} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Explainability toggle */}
                  {result.score_breakdown && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((p) => ({ ...p, [result.document_id]: !isOpen }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                      >
                        {isOpen ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Hide score breakdown
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Why this score?
                          </>
                        )}
                      </button>

                      {isOpen && (
                        <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <ScoreBreakdownPanel
                            breakdown={result.score_breakdown}
                            finalScore={result.score}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Evidence block ──────────────────────────────────────────────────────────

const TONE_STYLES: Record<string, string> = {
  indigo: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  violet: "bg-chart-4/15 text-chart-4",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function EvidenceBlock({
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
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 6).map((item) => (
          <span
            key={item}
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${TONE_STYLES[tone]}`}
          >
            {item}
          </span>
        ))}
        {items.length > 6 && (
          <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
            +{items.length - 6}
          </span>
        )}
      </div>
    </div>
  );
}
