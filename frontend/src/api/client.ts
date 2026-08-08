const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Widget {
  id: string;
  type: string;
  config: Record<string, unknown>;
  prompt: string | null;
  layout: { x: number; y: number; w: number; h: number };
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: Widget[];
}

export const api = {
  async login(email: string, password: string): Promise<string> {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${API_BASE}/auth/login`, { method: "POST", body });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    return data.access_token as string;
  },

  register(email: string, password: string) {
    return request("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });
  },

  listDashboards(): Promise<Dashboard[]> {
    return request("/dashboards");
  },

  createDashboard(name: string): Promise<Dashboard> {
    return request("/dashboards", { method: "POST", body: JSON.stringify({ name }) });
  },

  createWidget(dashboardId: string, payload: Partial<Widget> & { type: string }): Promise<Widget> {
    return request(`/dashboards/${dashboardId}/widgets`, { method: "POST", body: JSON.stringify(payload) });
  },

  updateWidget(dashboardId: string, widgetId: string, payload: Partial<Widget>): Promise<Widget> {
    return request(`/dashboards/${dashboardId}/widgets/${widgetId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteWidget(dashboardId: string, widgetId: string): Promise<void> {
    return request(`/dashboards/${dashboardId}/widgets/${widgetId}`, { method: "DELETE" });
  },
};

export function setToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  localStorage.removeItem("access_token");
}

export { getToken, API_BASE };
