"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function AccountPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < 12) { setMsg({ ok: false, text: "The new password needs at least 12 characters." }); return; }
    setBusy(true);
    try {
      await api("/auth/change-password", { method: "POST", body: JSON.stringify({ current_password: current, new_password: next }) });
      setCurrent(""); setNext("");
      setMsg({ ok: true, text: "Password changed." });
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
    setBusy(false);
  };

  return (
    <>
      <div className="head"><div><p className="kicker">Your account</p><h1 className="display">{user?.name}</h1></div></div>
      <section className="card card--narrow">
        <dl className="facts">
          <dt>Email</dt><dd>{user?.email}</dd>
          <dt>Member since</dt><dd>{user ? formatDate(user.created_at) : ""}</dd>
        </dl>
      </section>

      <section className="card card--narrow">
        <h2 className="card__title">Change password</h2>
        <form onSubmit={submit} className="stack">
          <label htmlFor="cur">Current password</label>
          <input id="cur" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          <label htmlFor="new">New password <span className="muted small">(12+ characters)</span></label>
          <input id="new" type="password" autoComplete="new-password" required minLength={12} value={next} onChange={(e) => setNext(e.target.value)} />
          {msg && <p className={msg.ok ? "success" : "error"} role="status">{msg.text}</p>}
          <button className="btn btn--grad btn--sm" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
        </form>
      </section>
    </>
  );
}
