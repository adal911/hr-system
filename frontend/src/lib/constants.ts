export const ROLES = {
  ADMIN: "admin",
  HR: "hr",
  INTERVIEWER: "interviewer",
} as const;

export interface NavItem {
  label: string;
  href: string;
  roles: string[];
  group: "Overview" | "Candidates" | "Intelligence" | "Admin";
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["admin", "hr", "interviewer"], group: "Overview" },

  { label: "Resumes", href: "/resumes", roles: ["admin", "hr"], group: "Candidates" },
  { label: "Search", href: "/search", roles: ["admin", "hr", "interviewer"], group: "Candidates" },
  { label: "Interviews", href: "/interviews", roles: ["admin", "hr", "interviewer"], group: "Candidates" },

  { label: "Compare", href: "/compare", roles: ["admin", "hr", "interviewer"], group: "Intelligence" },
  { label: "JD Match", href: "/jd-match", roles: ["admin", "hr", "interviewer"], group: "Intelligence" },
  { label: "Chatbot", href: "/chatbot", roles: ["admin", "hr", "interviewer"], group: "Intelligence" },

  { label: "Statistics", href: "/admin/statistics", roles: ["admin"], group: "Admin" },
  { label: "Users", href: "/admin/users", roles: ["admin"], group: "Admin" },
  { label: "Billing", href: "/settings/billing", roles: ["admin"], group: "Admin" },
];
