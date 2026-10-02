"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/Badges";
import {
  api, getTeam, STAGE_LABEL, STAGES, STATUS_LABEL,
  type LeadDetail, type Lead, type StageName, type Status, type TeamMember,
} from "@/lib/api";
import { businessLabel, formatDate, timeAgo } from "@/lib/format";

const STATUSES: Status[] = ["pending", "in_progress", "completed"];

function AssigneeSelect({ value, team, onChange, label }: { value: number | null; team: TeamMember[]; onChange: (v: number | null) => void; label: string }) {
  return (
    <select aria-label={label} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
      <option value="">Unassigned</option>
      {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  );
}

export default function LeadPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [comment, setComment] = useState("");
  const [commentStage, setCommentStage] = useState<StageName | "">("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try { setLead(await api<LeadDetail>(`/api/leads/${id}`)); setError(""); }
    catch (e) { if ((e as { status?: number }).status === 404) setNotFound(true); else setError((e as Error).message); }
  }, [id]);

  useEffect(() => { load(); getTeam().then(setTeam).catch(() => {}); }, [load]);

  // Both PATCH endpoints return the updated lead plus ordering warnings.
  const change = async (path: string, body: object) => {
    try {
      const r = await api<{ lead: Lead; warnings: string[] }>(path, { method: "PATCH", body: JSON.stringify(body) });
      setWarnings(r.warnings);
      setError("");
      await load();
    } catch (e) { setError((e as Error).message); }
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await api(`/api/leads/${id}/comments`, { method: "POST", body: JSON.stringify({ body: comment.trim(), stage: commentStage || null }) });
      setComment("");
      setError("");
      await load();
    } catch (err) { setError((err as Error).message); }
    setPosting(false);
  };

  if (notFound) return <div className="empty"><h2 className="display">Lead not found</h2><p><Link href="/" className="btn btn--sm">Back to leads</Link></p></div>;
  if (!lead) return <p className="muted">{error || "Loading…"}</p>;

  return (
    <>
      <Link href="/" className="back">← All leads</Link>
      <div className="head">
        <div>
          <p className="kicker">Request #{lead.id}</p>
          <h1 className="display">{lead.full_name}</h1>
        </div>
        <div className="head__badges">
          {lead.duplicate_email && <span className="repeat" title="Someone already submitted with this email">repeat contact</span>}
          <StatusBadge status={lead.status} />
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {warnings.length > 0 && (
        <div className="notice" role="status">
          <strong>Heads up:</strong> {warnings.join(" · ")}
        </div>
      )}

      <div className="grid">
        <section className="card">
          <h2 className="card__title">Contact</h2>
          <dl className="facts">
            <dt>Email</dt><dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd>
            <dt>Phone</dt><dd>{lead.phone ? <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>{lead.phone}</a> : <span className="muted">Not given</span>}</dd>
            <dt>Business</dt><dd>{businessLabel(lead)}</dd>
            <dt>Consent</dt><dd>{lead.consent ? "Agreed to be contacted" : "No"}</dd>
            <dt>Received</dt><dd>{formatDate(lead.created_at)}</dd>
          </dl>
          <div className="field-label">Lead owner</div>
          <AssigneeSelect label="Lead owner" value={lead.assigned_to} team={team} onChange={(v) => change(`/api/leads/${lead.id}`, { assigned_to: v })} />
        </section>

        <section className="card">
          <h2 className="card__title">Progress</h2>
          <ul className="stages">
            {lead.stages.map((s) => (
              <li key={s.stage} className="stage">
                <div className="stage__head">
                  <i className={`dot dot--${s.status}`} />
                  <strong>{STAGE_LABEL[s.stage]}</strong>
                  <span className="muted small">updated {timeAgo(s.updated_at)}</span>
                </div>
                <div className="stage__controls">
                  <select aria-label={`${STAGE_LABEL[s.stage]} status`} value={s.status} onChange={(e) => change(`/api/leads/${lead.id}/stages/${s.stage}`, { status: e.target.value })}>
                    {STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                  </select>
                  <AssigneeSelect label={`${STAGE_LABEL[s.stage]} assignee`} value={s.assigned_to} team={team} onChange={(v) => change(`/api/leads/${lead.id}/stages/${s.stage}`, { assigned_to: v })} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid">
        <section className="card">
          <h2 className="card__title">Comments</h2>
          {lead.comments.length === 0 && <p className="muted">No comments yet.</p>}
          <ul className="comments">
            {lead.comments.map((c) => (
              <li key={c.id}>
                <div className="comment__meta"><strong>{c.user_name}</strong>{c.stage && <span className="tag">{STAGE_LABEL[c.stage]}</span>}<span className="muted small">{formatDate(c.created_at)}</span></div>
                <p className="comment__body">{c.body}</p>
              </li>
            ))}
          </ul>
          <form onSubmit={postComment} className="comment-form">
            <label className="sr-only" htmlFor="comment">Add a comment</label>
            <textarea id="comment" rows={3} maxLength={2000} placeholder="Add a note for the team…" value={comment} onChange={(e) => setComment(e.target.value)} />
            <div className="comment-form__row">
              <select aria-label="About which stage" value={commentStage} onChange={(e) => setCommentStage(e.target.value as StageName | "")}>
                <option value="">General</option>
                {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
              </select>
              <button className="btn btn--grad btn--sm" disabled={posting || !comment.trim()}>{posting ? "Posting…" : "Post comment"}</button>
            </div>
            <p className="muted small">Comments can&apos;t be edited or deleted.</p>
          </form>
        </section>

        <section className="card">
          <h2 className="card__title">Activity</h2>
          {lead.activity.length === 0 && <p className="muted">Nothing yet.</p>}
          <ul className="timeline">
            {lead.activity.map((a) => (
              <li key={a.id}>
                <span>{a.message}</span>
                <span className="muted small">{timeAgo(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
