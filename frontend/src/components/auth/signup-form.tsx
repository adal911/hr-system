"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, User, Building2, Sparkles } from "lucide-react";

export function SignupForm() {
  const params = useSearchParams();
  const initialPlan = params.get("plan") || "pro";

  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signup(companyName, username, password);
      toast.success("Welcome to HR Data Room — your 14-day trial has started.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          14-day Pro trial · No card needed
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Create your workspace</h2>
        <p className="text-sm text-muted-foreground">
          You&apos;ll be the admin of your company&apos;s HR Data Room.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="company"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Company name
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="company"
              type="text"
              autoComplete="organization"
              placeholder="e.g. Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              minLength={2}
              className="h-11 pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="username"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Username
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="your.username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="h-11 pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 pl-10"
            />
          </div>
        </div>

        <input type="hidden" name="plan" value={initialPlan} />

        <Button
          type="submit"
          className="h-11 w-full gap-2 rounded-lg shadow-md shadow-primary/15"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating workspace…
            </>
          ) : (
            "Start free trial"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
