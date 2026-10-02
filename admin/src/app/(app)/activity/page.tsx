"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getTeam, type Activity, type ActivityPage, type TeamMember } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";

const LIMIT = 30;

export default function ActivityPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (before: number | null, replace: boolean) => {
    setLoading(true);
    const p = new URLSearchParams({ limit: String(LIMIT) });
    if (userId) p.set("user_id", userId);
    if (before) p.set("before", String(before));
    try {
      const d = await api<ActivityPage>(`/api/activity?${p}`);
      setItems((prev) => (replace ? d.items : [...prev, ...d.items]));
      setNext(d.next_before);
      setError("");
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(null, true); }, [load]);
  useEffect(() => { getTeam().then(setTeam).catch(() => {}); }, []);

  return (
    <>
      <div className="head">
        <div>
          <p className="kicker">Everything that happened</p>
          <h1 className="display">Activity</h1>
        </div>
        <select aria-label="Filter by team member" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Everyone</option>
          {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {!loading && items.length === 0 && !error && (
        <div className="empty"><h2 className="display">Nothing here yet</h2><p className="muted">Actions on leads will be listed here.</p></div>
      )}

      <ul className="feed">
        {items.map((a) => (
          <li key={a.id}>
            <div>
              <Link href={`/leads/${a.lead_id}`}>{a.message}</Link>
              <div className="muted small">{a.user_name ?? "System"}</div>
            </div>
            <span className="muted small nowrap" title={formatDate(a.created_at)}>{timeAgo(a.created_at)}</span>
          </li>
        ))}
      </ul>

      {next !== null && <div className="pager"><button className="btn btn--sm" disabled={loading} onClick={() => load(next, false)}>{loading ? "Loading…" : "Load older"}</button></div>}
    </>
  );
}
