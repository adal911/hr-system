import { LoginForm } from "@/components/auth/login-form";
import { Sparkles, ShieldCheck, BarChart3, Bot } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden overflow-hidden bg-aurora lg:block">
        <div className="absolute inset-0 bg-grid-fade opacity-40" />

        <div className="relative flex h-full flex-col justify-between p-12">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-chart-4 shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-tight">
                HR Data Room
              </span>
              <span className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                AI Recruitment Suite
              </span>
            </div>
          </div>

          {/* Tagline */}
          <div className="max-w-md space-y-6">
            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight">
                Hire smarter with <span className="text-gradient">grounded AI</span>.
              </h1>
              <p className="mt-4 text-base text-muted-foreground">
                Resume-grounded chatbot, hybrid search, structured interview workflows —
                all backed by retrieval-augmented generation.
              </p>
            </div>

            <div className="grid gap-3">
              <Feature
                icon={Bot}
                title="RAG-powered Q&A"
                description="Ask anything about a candidate, scoped to their resume."
              />
              <Feature
                icon={BarChart3}
                title="Explainable scoring"
                description="See exactly why a candidate matched your query."
              />
              <Feature
                icon={ShieldCheck}
                title="Role-based access"
                description="Admin, HR, Interviewer — fine-grained permissions."
              />
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} HR Data Room · Built for academic research
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-chart-4 shadow-md shadow-primary/20">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold">HR Data Room</span>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3 backdrop-blur-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
