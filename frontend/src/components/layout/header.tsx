"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOut, User as UserIcon } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";

function usePageTitle() {
  const pathname = usePathname();
  const match = NAV_ITEMS.find((item) =>
    item.href === pathname ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );
  if (match) return match.label;
  if (pathname.startsWith("/resumes/")) return "Resume Detail";
  if (pathname.startsWith("/interviews/")) return "Interview Detail";
  return "HR Data Room";
}

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const title = usePageTitle();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user?.username?.charAt(0).toUpperCase() || "U";
  const roleColor =
    user?.role === "admin"
      ? "text-chart-4"
      : user?.role === "hr"
      ? "text-primary"
      : "text-chart-2";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <span className="rounded-full border border-border/80 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          v1.0
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <div className="mx-1 h-6 w-px bg-border/80" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 gap-2 rounded-full pl-1 pr-3"
            >
              <Avatar className="h-7 w-7 ring-2 ring-primary/15">
                <AvatarFallback className="bg-linear-to-br from-primary to-chart-4 text-xs font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start leading-none sm:flex">
                <span className="text-sm font-medium">{user?.username}</span>
                <span className={`mt-0.5 text-[10px] font-medium uppercase tracking-wider ${roleColor}`}>
                  {user?.role}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-linear-to-br from-primary to-chart-4 text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold">{user?.username}</p>
                  <p className={`text-xs capitalize ${roleColor}`}>{user?.role}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
