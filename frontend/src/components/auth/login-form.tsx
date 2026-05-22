"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, User } from "lucide-react";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      toast.success("Welcome back");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
        <p className="text-sm text-muted-foreground">
          Use the credentials provided by your administrator.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
          <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 pl-10"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-11 w-full gap-2 rounded-lg shadow-md shadow-primary/15"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Need access? Contact your HR administrator.
      </p>
    </div>
  );
}
