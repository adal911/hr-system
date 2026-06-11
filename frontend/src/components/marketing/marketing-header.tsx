"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles } from "lucide-react";

export function MarketingHeader() {
  const { user, token } = useAuth();
  const isAuthed = !!(user && token);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-chart-4 shadow-md shadow-primary/20">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">HR Data Room</span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href="/#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/#how"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthed ? (
            <Link href="/dashboard">
              <Button size="sm" className="shadow-md shadow-primary/15">
                Open dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-block">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="shadow-md shadow-primary/15">
                  Start free trial
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
