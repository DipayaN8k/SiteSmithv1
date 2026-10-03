// API layer — the ONLY file that talks to the backend (see backend docs/FRONTEND_API.md).
// With NEXT_PUBLIC_API_URL set, requests go to the real backend. Without it, a mock is used
// so the site still runs standalone.

// Must match BUSINESS_TYPES in backend app/core/constants.py.
export const BUSINESS_TYPES = [
  "Retail",
  "Healthcare",
  "Education",
  "Manufacturing",
  "IT/Software",
  "Finance",
  "Real Estate",
  "Hospitality",
  "Other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

// Fields the backend accepts today (POST /api/contact).
export type ContactRequest = {
  full_name: string;
  email: string;
  phone: string | null;
  business_type: BusinessType;
  business_type_other: string | null;
  consent: true;
  website: string; // honeypot — always empty for real users
};

// Sent with the contact request; the backend stores all three on the lead.
export type ProjectDetails = {
  project_type: string;
  budget: string;
  message: string | null;
};

export type ContactResult =
  | { ok: true; message: string }
  | { ok: false; kind: "validation"; message: string; fields: Record<string, string> }
  | { ok: false; kind: "rate_limited" | "network"; message: string };

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const THANKS = "Thanks, your request has been received. Our team will get back to you.";

// Backend field names -> the form's field names, so errors land next to the right input.
const FIELD_MAP: Record<string, string> = { full_name: "name", email: "email", phone: "phone", consent: "consent" };

// 422 bodies have a list in `detail`; some business-rule errors have a string instead.
function readValidation(body: unknown): { message: string; fields: Record<string, string> } {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string") return { message: detail, fields: {} };
  const fields: Record<string, string> = {};
  const general: string[] = [];
  if (Array.isArray(detail)) {
    for (const e of detail as { loc?: unknown[]; msg?: string }[]) {
      const msg = (e.msg ?? "Invalid value").replace(/^Value error, /, "");
      const key = typeof e.loc?.[1] === "string" ? FIELD_MAP[e.loc[1] as string] : undefined;
      if (key) fields[key] = msg;
      else general.push(msg);
    }
  }
  const message = general.length ? general.join(". ") : "Please check the highlighted fields and try again.";
  return { message, fields };
}

export async function submitContact(contact: ContactRequest, details: ProjectDetails): Promise<ContactResult> {
  if (!API_URL) {
    await wait(900);
    console.info("[mock api] contact submitted", { business_type: contact.business_type, ...details });
    return { ok: true, message: THANKS };
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...contact, ...details }),
    });
  } catch {
    return { ok: false, kind: "network", message: "Couldn't reach our server. Check your connection and try again, or WhatsApp us." };
  }

  if (res.status === 201) {
    const body = await res.json().catch(() => null);
    return { ok: true, message: body?.message ?? THANKS };
  }
  if (res.status === 429) {
    return { ok: false, kind: "rate_limited", message: "Too many submissions, please try again later." };
  }
  if (res.status === 422) {
    const body = await res.json().catch(() => null);
    return { ok: false, kind: "validation", ...readValidation(body) };
  }
  return { ok: false, kind: "network", message: `Something went wrong on our side (error ${res.status}). Please try again, or WhatsApp us.` };
}
