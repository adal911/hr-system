export type Role = "admin" | "hr" | "interviewer";

export type LicenseStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "incomplete"
  | "expired"
  | "missing";

export type PlanId = "starter" | "pro" | "enterprise";

export interface PlanMeta {
  id: PlanId;
  name: string;
  tagline: string;
  price_monthly_usd: number;
  features: string[];
  quotas: {
    users: number;
    resumes_per_month: number;
    interviews: number;
    chatbot_sessions: number;
  };
  highlight: boolean;
}

export interface LicenseState {
  status: LicenseStatus;
  is_active: boolean;
  is_trial: boolean;
  days_remaining: number;
  plan: PlanId | null;
  plan_meta: PlanMeta | null;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  username: string;
  role: Role;
  company_id?: string | null;
  company?: Company | null;
  license?: LicenseState | null;
}

export interface AuthResponse {
  token: string;
  user: User;
  company?: Company;
  license?: LicenseState;
}

export interface SignupRequest {
  company_name: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}
