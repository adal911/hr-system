import Link from "next/link";
import { Sparkles } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="md:col-span-1">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-linear-to-br from-primary to-chart-4">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">HR Data Room</span>
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            AI-assisted recruitment, powered by retrieval-augmented generation.
          </p>
        </div>

        <FooterColumn
          title="Product"
          links={[
            { label: "Features", href: "/#features" },
            { label: "Pricing", href: "/pricing" },
            { label: "How it works", href: "/#how" },
          ]}
        />
        <FooterColumn
          title="Account"
          links={[
            { label: "Sign in", href: "/login" },
            { label: "Start free trial", href: "/signup" },
          ]}
        />
        <FooterColumn
          title="Project"
          links={[
            { label: "Academic FYP", href: "#" },
            { label: "RAG + Hybrid Search", href: "#" },
          ]}
        />
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} HR Data Room. All rights reserved.</p>
          <p>Built with Next.js, Django, MongoDB, and Gemini.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
