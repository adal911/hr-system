const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(
      error.error || error.detail || "Request failed",
      res.status
    );
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string, token?: string | null) =>
    request<T>(endpoint, { method: "GET" }, token),

  post: <T>(endpoint: string, body: unknown, token?: string | null) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }, token),

  put: <T>(endpoint: string, body: unknown, token?: string | null) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }, token),

  delete: <T>(endpoint: string, token?: string | null) =>
    request<T>(endpoint, { method: "DELETE" }, token),

  postForm: <T>(endpoint: string, formData: FormData, token?: string | null) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Don't set Content-Type — browser sets it with boundary for multipart
    return fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Request failed" }));
        throw new ApiError(
          error.error || error.detail || "Request failed",
          res.status
        );
      }
      return res.json() as Promise<T>;
    });
  },
};
