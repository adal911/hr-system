export type Role = "admin" | "hr" | "interviewer";

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role: Role;
}
