// All backend calls for the dashboard live here (see backend docs/FRONTEND_API.md).
// The token is kept in sessionStorage (cleared when the tab closes) and never put in a URL.

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const KEY = "admin-token-v1";

export const getToken = (): string | null => {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
};
export const setToken = (t: string | null) => {
  try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY); } catch {}
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// 422 has a list in `detail`, other errors a string, rate limits use `error`.
function errorMessage(body: unknown): string {
  const b = body as { detail?: unknown; error?: string } | null;
  if (typeof b?.detail === "string") return b.detail;
  if (Array.isArray(b?.detail)) return (b!.detail as { msg?: string }[]).map((e) => (e.msg ?? "").replace(/^Value error, /, "")).join(". ");
  return b?.error ?? "Something went wrong";
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0);
  }
  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event("admin:logout")); // AuthProvider sends the user to /login
    throw new ApiError("Your session expired. Please sign in again.", 401);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(errorMessage(body), res.status);
  return body as T;
}

/* ---------- types ---------- */
export type Status = "pending" | "in_progress" | "completed";
export type StageName = "backend" | "frontend" | "deployment";
export const STAGES: StageName[] = ["backend", "frontend", "deployment"];
export const STATUS_LABEL: Record<Status, string> = { pending: "Pending", in_progress: "In progress", completed: "Completed" };
export const STAGE_LABEL: Record<StageName, string> = { backend: "Backend", frontend: "Frontend", deployment: "Deployment" };

export type User = { id: number; name: string; email: string; created_at: string };
export type TeamMember = { id: number; name: string };
export type Stage = { stage: StageName; status: Status; assigned_to: number | null; assigned_to_name: string | null; updated_at: string };
export type Lead = {
  id: number; full_name: string; email: string; phone: string | null;
  business_type: string; business_type_other: string | null;
  assigned_to: number | null; assigned_to_name: string | null;
  consent: boolean; created_at: string; updated_at: string;
  status: Status; duplicate_email: boolean; stages: Stage[];
};
export type LeadList = { items: Lead[]; total: number; page: number; page_size: number };
export type Comment = { id: number; lead_id: number; stage: StageName | null; user_id: number; user_name: string; body: string; created_at: string };
export type Activity = {
  id: number; lead_id: number; user_id: number | null; user_name: string | null;
  action: string; stage: StageName | null; old_value: string | null; new_value: string | null;
  message: string; created_at: string;
};
export type LeadDetail = Lead & { comments: Comment[]; activity: Activity[] };
export type ActivityPage = { items: Activity[]; next_before: number | null };

let teamCache: TeamMember[] | null = null;
export async function getTeam(): Promise<TeamMember[]> {
  return (teamCache ??= await api<TeamMember[]>("/api/users"));
}
