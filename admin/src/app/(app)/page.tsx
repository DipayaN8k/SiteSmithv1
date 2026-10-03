"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StageDots, StatusBadge } from "@/components/Badges";
import { api, STATUS_LABEL, type LeadList, type Status } from "@/lib/api";
import { businessLabel, timeAgo } from "@/lib/format";

const PAGE_SIZE = 20;
const FILTERS: (Status | "")[] = ["", "pending", "in_progress", "completed"];

export default function LeadsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | "">("");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeadList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => { setDebounced(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (status) p.set("status", status);
    if (debounced) p.set("q", debounced);
    api<LeadList>(`/api/leads?${p}`)
      .then((d) => { if (!cancelled) { setData(d); setError(""); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, debounced, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <>
      <div className="head">
        <div>
          <p className="kicker">Requests</p>
          <h1 className="display">Leads</h1>
        </div>
        {data && <p className="muted count">{data.total} {data.total === 1 ? "request" : "requests"}</p>}
      </div>

      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f || "all"} aria-pressed={status === f} onClick={() => { setStatus(f); setPage(1); }}>
              {f ? <><i className={`dot dot--${f}`} />{STATUS_LABEL[f]}</> : "All"}
            </button>
          ))}
        </div>
        <label className="search">
          <span className="sr-only">Search by name or email</span>
          <input type="search" placeholder="Search name or email" maxLength={200} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {data && data.items.length === 0 && !loading && (
        <div className="empty">
          <h2 className="display">{debounced || status ? "No leads match" : "No requests yet"}</h2>
          <p className="muted">{debounced || status ? "Try a different search or filter." : "New project requests from the website's form will appear here."}</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="tablewrap" data-loading={loading}>
          <table className="table">
            <thead>
              <tr><th>Lead</th><th>Business</th><th>Stages</th><th>Status</th><th>Assigned</th><th>Received</th></tr>
            </thead>
            <tbody>
              {data.items.map((l) => (
                <tr key={l.id} className="row-link" onClick={() => router.push(`/leads/${l.id}`)}>
                  <td>
                    <Link href={`/leads/${l.id}`} className="lead-link">{l.full_name}</Link>
                    {l.duplicate_email && <span className="repeat" title="Someone already submitted with this email">repeat</span>}
                    <div className="muted small">{l.email}</div>
                  </td>
                  <td>{businessLabel(l)}</td>
                  <td><StageDots stages={l.stages} /></td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>{l.assigned_to_name ?? <span className="muted">Unassigned</span>}</td>
                  <td className="muted nowrap">{timeAgo(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && pages > 1 && (
        <div className="pager">
          <button className="btn btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="muted">Page {data.page} of {pages}</span>
          <button className="btn btn--sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </>
  );
}
