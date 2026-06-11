import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowRight,
  Bot,
  Target,
  Zap,
  Search,
  GitCompare,
  ClipboardList,
  Shield,
  Database,
  Layers,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-aurora">
        <div className="absolute inset-0 bg-grid-fade opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Grounded AI · No hallucinations
            </div>
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Hire smarter with <span className="text-gradient">AI that reads resumes</span> — not invents them.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              HR Data Room combines hybrid search, retrieval-augmented chat, and structured interview workflows into one
              workspace. Every answer is grounded in the candidate&apos;s actual resume.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup">
                <Button size="lg" className="h-11 gap-1.5 px-6 shadow-md shadow-primary/20">
                  Start 14-day free trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="h-11 px-6">
                  View pricing
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Cancel anytime · Set up in 60 seconds
            </p>
          </div>

          {/* Trust strip / mock app preview */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="relative overflow-hidden rounded-2xl border border-border/70 card-elevated">
              <div className="border-b border-border/60 bg-muted/30 px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <p className="ml-3 text-xs text-muted-foreground">app.hr-dataroom.com/search</p>
                </div>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                <PreviewMetric label="Match score" value="92.4%" sub="Strong fit" tone="emerald" />
                <PreviewMetric label="Matched skills" value="7 / 8" sub="Python, React, AWS…" tone="primary" />
                <PreviewMetric label="Search latency" value="380ms" sub="Hybrid retrieval" tone="amber" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────────── */}
      <section id="features" className="mx-auto w-full max-w-7xl px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">Everything you need</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One workspace for the whole hiring loop.
          </h2>
          <p className="mt-3 text-muted-foreground">
            From the moment a resume is uploaded to the moment a decision is made — everything stays grounded in source data.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Search}
            title="Hybrid Search"
            description="Keyword + semantic vector search across structured resume data. Pinpoint the right candidate from a natural-language query."
          />
          <FeatureCard
            icon={Bot}
            title="Resume-Grounded Chat"
            description="Ask anything about a candidate. Answers cite the resume chunks they came from — no hallucinations."
          />
          <FeatureCard
            icon={ClipboardList}
            title="Structured Interviews"
            description="AI suggests answers from the resume, you record actuals, and a single click produces a balanced summary."
          />
          <FeatureCard
            icon={Target}
            title="JD → Candidate Matching"
            description="Paste a job description. We extract requirements and rank every candidate by fit, with skill gaps surfaced."
          />
          <FeatureCard
            icon={GitCompare}
            title="Side-by-Side Compare"
            description="Compare up to 5 candidates. Common ground, unique strengths, skill overlap — all in one view."
          />
          <FeatureCard
            icon={Zap}
            title="Explainable Scoring"
            description="Every match shows why. Section contributions, query coverage, matched terms — full transparency."
          />
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────────────── */}
      <section id="how" className="border-y border-border/60 bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              From upload to decision in minutes.
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Step
              n={1}
              title="Upload resumes"
              description="PDF or DOCX. Stored on Cloudinary; text extracted, chunked, embedded."
            />
            <Step
              n={2}
              title="Search & rank"
              description="Hybrid retrieval finds candidates; JD matching ranks them by fit."
            />
            <Step
              n={3}
              title="Chat or interview"
              description="Ask grounded questions, or kick off structured interview sessions."
            />
            <Step
              n={4}
              title="Decide with confidence"
              description="Explainable scores, comparative views, and AI summaries inform every call."
            />
          </div>
        </div>
      </section>

      {/* ─── Tech / academic angle ─────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-6 py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">Under the hood</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Modern AI stack, classical IR rigor.
            </h2>
            <p className="mt-4 text-muted-foreground">
              We combine MongoDB Atlas Vector Search with weighted keyword scoring across structured resume fields.
              The chatbot uses retrieval-augmented generation with strict prompt grounding — answers are constrained
              to the source resume text.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <TechStat icon={Database} label="Vector store" value="MongoDB Atlas" />
              <TechStat icon={Layers} label="Retrieval" value="Hybrid (KW + ANN)" />
              <TechStat icon={Bot} label="Generation" value="Gemini 2.5" />
              <TechStat icon={Shield} label="Auth" value="JWT · Role-based" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 bg-aurora opacity-60" />
            <div className="rounded-2xl border border-border/70 card-elevated p-6">
              <div className="space-y-3 font-mono text-xs">
                <CodeLine prompt="$" text="POST /api/search/?q=‘engineers who built recsys at scale’" />
                <CodeLine text="→ Tokenize → Filter stop words → Detect natural language" muted />
                <CodeLine text="→ Vector search (Atlas) + Keyword search (structured)" muted />
                <CodeLine text="→ Score = 0.4·section + 0.6·token_coverage" muted />
                <CodeLine
                  text='[{"candidate": "Ada Lovelace", "score": 0.924, "explain": {...}}]'
                  highlight
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border/60 bg-aurora">
        <div className="absolute inset-0 bg-grid-fade opacity-50" />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to give your hiring team superpowers?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start your 14-day Pro trial. No credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg" className="h-11 gap-1.5 px-6 shadow-md shadow-primary/20">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-11 px-6">
                Compare plans
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/70 card-elevated p-6 transition-all hover:border-primary/30 hover:-translate-y-0.5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="relative rounded-2xl border border-border/70 bg-background p-5">
      <div className="absolute -top-3 left-5 flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-primary to-chart-4 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20">
        {n}
      </div>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "primary" | "amber";
}) {
  const styles = {
    emerald: "from-emerald-500/15 to-transparent text-emerald-600 dark:text-emerald-400",
    primary: "from-primary/15 to-transparent text-primary",
    amber: "from-amber-500/15 to-transparent text-amber-600 dark:text-amber-400",
  }[tone];

  return (
    <div className={`rounded-xl border border-border/70 bg-linear-to-br p-4 ${styles}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function TechStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card p-3">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function CodeLine({
  text,
  prompt,
  muted,
  highlight,
}: {
  text: string;
  prompt?: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex gap-2 ${
        muted ? "text-muted-foreground" : highlight ? "rounded-md bg-primary/10 px-2 py-1 text-foreground" : "text-foreground"
      }`}
    >
      {prompt && <span className="select-none text-primary">{prompt}</span>}
      <span className="break-all">{text}</span>
    </div>
  );
}

