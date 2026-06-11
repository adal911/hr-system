import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { Sparkles, ShieldCheck, Zap, Bot } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden overflow-hidden bg-aurora lg:block">
        <div className="absolute inset-0 bg-grid-fade opacity-40" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-chart-4 shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-tight">HR Data Room</span>
              <span className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                AI Recruitment Suite
              </span>
            </div>
          </div>

          <div className="max-w-md space-y-6">
            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight">
                Your team&apos;s <span className="text-gradient">hiring superpower</span> starts here.
              </h1>
              <p className="mt-4 text-base text-muted-foreground">
                Spin up a workspace in 60 seconds. 14-day Pro trial, no credit card.
              </p>
            </div>

            <div className="grid gap-3">
              <Feature
                icon={Zap}
                title="Instant setup"
                description="No installs, no migrations. Upload a resume and start searching immediately."
              />
              <Feature
                icon={Bot}
                title="Grounded answers"
                description="RAG-powered chat that cites the resume — not invents facts."
              />
              <Feature
                icon={ShieldCheck}
                title="Tenant-isolated"
                description="Your data is scoped to your company. Always."
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} HR Data Room
          </p>
        </div>
      </div>

      {/* Right — signup form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-chart-4 shadow-md shadow-primary/20">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold">HR Data Room</span>
          </div>

          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>
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
