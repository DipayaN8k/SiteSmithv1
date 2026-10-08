import {
  COMMENT_ADDED, LEAD_ASSIGNED, LEAD_CREATED, REQUIREMENT_ADDED, REQUIREMENT_TOGGLED,
  STAGE_ASSIGNED, STAGE_STATUS_CHANGED, STAGES,
} from '../core/constants.js';
import { ServiceError } from '../core/errors.js';
import { nowTs, toIso } from '../core/time.js';
import { activityOut, logActivity } from './activity.js';
import { getById, isActive } from './users.js';

// ---------- pure helpers ----------

/** Overall status is computed from the stages and never stored. */
export function deriveStatus(statuses) {
  const s = [...statuses];
  if (s.length === 0 || s.every((x) => x === 'pending')) return 'pending';
  if (s.every((x) => x === 'completed')) return 'completed';
  return 'in_progress';
}

/** Out-of-order progress is allowed but reported. */
export function stageWarnings(statusByStage) {
  const warnings = [];
  STAGES.forEach((stage, i) => {
    const status = statusByStage[stage];
    if (status !== 'in_progress' && status !== 'completed') return;
    for (const earlier of STAGES.slice(0, i)) {
      if (statusByStage[earlier] !== 'completed') {
        warnings.push(
          status === 'completed'
            ? `${stage} completed before ${earlier}`
            : `${stage} in progress before ${earlier} completed`,
        );
      }
    }
  });
  return warnings;
}

const title = (stage) => stage.charAt(0).toUpperCase() + stage.slice(1);
const label = (status) => status.replace(/_/g, ' ');
const placeholders = (list) => list.map(() => '?').join(', ');

// ---------- loading / serialising ----------

async function attachStages(db, leads) {
  if (leads.length === 0) return [];
  const ids = leads.map((l) => l.id);
  const rows = await db.query(
    `SELECT s.*, u.name AS assignee_name FROM lead_stages s LEFT JOIN users u ON u.id = s.assigned_to
     WHERE s.lead_id IN (${placeholders(ids)}) ORDER BY s.id`,
    ids,
  );
  const byLead = new Map(ids.map((id) => [id, []]));
  for (const row of rows) byLead.get(row.lead_id).push(row);
  return leads.map((lead) => ({ ...lead, stages: byLead.get(lead.id) }));
}

const LEAD_SELECT = 'SELECT l.*, u.name AS assignee_name FROM leads l LEFT JOIN users u ON u.id = l.assigned_to';

export async function getLead(db, leadId) {
  const rows = await attachStages(db, await db.query(`${LEAD_SELECT} WHERE l.id = ?`, [leadId]));
  if (rows.length === 0) throw new ServiceError(404, 'Lead not found');
  return rows[0];
}

export async function duplicateEmails(db, emails) {
  const unique = [...new Set(emails)];
  if (unique.length === 0) return new Set();
  const rows = await db.query(
    `SELECT email FROM leads WHERE email IN (${placeholders(unique)}) GROUP BY email HAVING COUNT(*) > 1`,
    unique,
  );
  return new Set(rows.map((r) => r.email));
}

export function toSummary(lead, duplicate) {
  const stages = [...lead.stages].sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
  return {
    id: lead.id,
    full_name: lead.full_name,
    email: lead.email,
    phone: lead.phone,
    business_type: lead.business_type,
    business_type_other: lead.business_type_other,
    project_type: lead.project_type,
    budget: lead.budget,
    message: lead.message,
    assigned_to: lead.assigned_to,
    assigned_to_name: lead.assignee_name ?? null,
    consent: Number(lead.consent) === 1,
    created_at: toIso(lead.created_at),
    updated_at: toIso(lead.updated_at),
    status: deriveStatus(stages.map((s) => s.status)),
    duplicate_email: duplicate,
    stages: stages.map((s) => ({
      stage: s.stage,
      status: s.status,
      assigned_to: s.assigned_to,
      assigned_to_name: s.assignee_name ?? null,
      updated_at: toIso(s.updated_at),
    })),
  };
}

export async function summarize(db, lead) {
  return toSummary(lead, (await duplicateEmails(db, [lead.email])).has(lead.email));
}

const commentOut = (r) => ({
  id: r.id, lead_id: r.lead_id, stage: r.stage, user_id: r.user_id, user_name: r.user_name,
  body: r.body, created_at: toIso(r.created_at),
});

export const requirementOut = (r) => ({
  id: r.id,
  lead_id: r.lead_id,
  stage: r.stage,
  text: r.text,
  done: Number(r.done) === 1,
  created_by_name: r.created_by_name,
  done_by_name: r.done_by_name ?? null,
  done_at: toIso(r.done_at),
  created_at: toIso(r.created_at),
});

const REQUIREMENT_SELECT = `SELECT r.*, a.name AS created_by_name, c.name AS done_by_name FROM requirements r
  JOIN users a ON a.id = r.created_by LEFT JOIN users c ON c.id = r.done_by`;

export async function leadDetail(db, leadId) {
  const lead = await getLead(db, leadId);
  const summary = await summarize(db, lead);
  const comments = await db.query(
    `SELECT c.*, u.name AS user_name FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.lead_id = ? ORDER BY c.created_at, c.id`,
    [leadId],
  );
  const activity = await db.query(
    `SELECT a.*, u.name AS user_name FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
     WHERE a.lead_id = ? ORDER BY a.id DESC`,
    [leadId],
  );
  const requirements = await db.query(`${REQUIREMENT_SELECT} WHERE r.lead_id = ? ORDER BY r.id`, [leadId]);
  return {
    ...summary,
    comments: comments.map(commentOut),
    activity: activity.map(activityOut),
    requirements: requirements.map(requirementOut),
  };
}

// ---------- queries ----------

const escapeLike = (term) => term.replace(/[!%_]/g, (c) => `!${c}`);

/** Search in SQL; derive status in JS (fine at this volume), then paginate. */
export async function listLeads(db, { status, q, page, pageSize }) {
  const where = [];
  const params = [];
  if (q && q.trim()) {
    const like = `%${escapeLike(q.trim())}%`;
    where.push("(l.full_name LIKE ? ESCAPE '!' OR l.email LIKE ? ESCAPE '!')");
    params.push(like, like);
  }
  const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const order = ' ORDER BY l.created_at DESC, l.id DESC';

  let window;
  let total;
  if (!status) {
    total = Number((await db.query(`SELECT COUNT(*) AS n FROM leads l${clause}`, params))[0].n);
    window = await attachStages(db, await db.query(`${LEAD_SELECT}${clause}${order} LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]));
  } else {
    const all = (await attachStages(db, await db.query(`${LEAD_SELECT}${clause}${order}`, params))).filter(
      (lead) => deriveStatus(lead.stages.map((s) => s.status)) === status,
    );
    total = all.length;
    window = all.slice((page - 1) * pageSize, page * pageSize);
  }
  const dupes = await duplicateEmails(db, window.map((l) => l.email));
  return { items: window.map((l) => toSummary(l, dupes.has(l.email))), total };
}

// ---------- mutations (callers pass a transaction handle) ----------

export async function createLead(tx, data) {
  const email = data.email.toLowerCase();
  const isDuplicate = Number((await tx.query('SELECT COUNT(*) AS n FROM leads WHERE email = ?', [email]))[0].n) > 0;
  const now = nowTs();
  const { insertId: leadId } = await tx.run(
    `INSERT INTO leads (full_name, email, phone, business_type, business_type_other, project_type, budget, message,
                        assigned_to, consent, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    [data.full_name, email, data.phone, data.business_type, data.business_type_other, data.project_type,
     data.budget, data.message, data.consent ? 1 : 0, now, now],
  );
  for (const stage of STAGES) {
    await tx.run("INSERT INTO lead_stages (lead_id, stage, status, assigned_to, updated_at) VALUES (?, ?, 'pending', NULL, ?)", [leadId, stage, now]);
  }
  const kind = data.business_type === 'Other' ? data.business_type_other : data.business_type;
  let message = `New request from ${data.full_name} (${kind})`;
  if (isDuplicate) message += ' - this email has submitted before';
  await logActivity(tx, leadId, null, LEAD_CREATED, { message });
  return leadId;
}

async function resolveAssignee(db, userId) {
  if (userId === null || userId === undefined) return null;
  const user = await getById(db, userId);
  if (!user || !isActive(user)) throw new ServiceError(422, 'assigned_to must be an active team member');
  return user;
}

export async function assignLead(tx, lead, actor, assignedTo) {
  const next = await resolveAssignee(tx, assignedTo);
  const old = lead.assigned_to ? await getById(tx, lead.assigned_to) : null;
  if ((old?.id ?? null) === (next?.id ?? null)) return;
  await tx.run('UPDATE leads SET assigned_to = ?, updated_at = ? WHERE id = ?', [next?.id ?? null, nowTs(), lead.id]);
  const message = next
    ? `${actor.name} assigned the request to ${next.name}`
    : `${actor.name} unassigned the request (was ${old.name})`;
  await logActivity(tx, lead.id, actor.id, LEAD_ASSIGNED, {
    old: old?.name ?? 'Unassigned', new: next?.name ?? 'Unassigned', message,
  });
}

export async function updateStage(tx, lead, stage, actor, { status, setAssignee, assignedTo }) {
  if (!STAGES.includes(stage)) throw new ServiceError(404, 'Unknown stage');
  const row = lead.stages.find((s) => s.stage === stage);
  let changed = false;
  const now = nowTs();

  if (status !== undefined && status !== row.status) {
    await tx.run('UPDATE lead_stages SET status = ? WHERE id = ?', [status, row.id]);
    changed = true;
    await logActivity(tx, lead.id, actor.id, STAGE_STATUS_CHANGED, {
      stage, old: row.status, new: status,
      message: `${actor.name} moved ${title(stage)}: ${label(row.status)} → ${label(status)}`,
    });
  }

  if (setAssignee) {
    const next = await resolveAssignee(tx, assignedTo);
    const old = row.assigned_to ? await getById(tx, row.assigned_to) : null;
    if ((old?.id ?? null) !== (next?.id ?? null)) {
      await tx.run('UPDATE lead_stages SET assigned_to = ? WHERE id = ?', [next?.id ?? null, row.id]);
      changed = true;
      const message = next
        ? `${actor.name} assigned ${title(stage)} to ${next.name}`
        : `${actor.name} unassigned ${title(stage)} (was ${old.name})`;
      await logActivity(tx, lead.id, actor.id, STAGE_ASSIGNED, {
        stage, old: old?.name ?? 'Unassigned', new: next?.name ?? 'Unassigned', message,
      });
    }
  }

  if (changed) {
    await tx.run('UPDATE lead_stages SET updated_at = ? WHERE id = ?', [now, row.id]);
    await tx.run('UPDATE leads SET updated_at = ? WHERE id = ?', [now, lead.id]);
  }
}

export async function addComment(tx, lead, actor, { body, stage }) {
  if (stage !== null && stage !== undefined && !STAGES.includes(stage)) {
    throw new ServiceError(422, `stage must be one of: ${STAGES.join(', ')}`);
  }
  const { insertId } = await tx.run('INSERT INTO comments (lead_id, stage, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)', [
    lead.id, stage ?? null, actor.id, body, nowTs(),
  ]);
  await logActivity(tx, lead.id, actor.id, COMMENT_ADDED, {
    stage: stage ?? null,
    message: `${actor.name} commented${stage ? ` on ${title(stage)}` : ''}`,
  });
  const rows = await tx.query('SELECT c.*, u.name AS user_name FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?', [insertId]);
  return commentOut(rows[0]);
}

/** Hard delete: the lead, its stages, comments, requirements and activity history. */
export async function deleteLead(tx, lead) {
  for (const table of ['activity_log', 'comments', 'requirements', 'lead_stages']) {
    await tx.run(`DELETE FROM ${table} WHERE lead_id = ?`, [lead.id]);
  }
  await tx.run('DELETE FROM leads WHERE id = ?', [lead.id]);
}

// ---------- requirements ----------

export async function getRequirement(db, leadId, requirementId) {
  const rows = await db.query(`${REQUIREMENT_SELECT} WHERE r.id = ? AND r.lead_id = ?`, [requirementId, leadId]);
  if (rows.length === 0) throw new ServiceError(404, 'Requirement not found');
  return rows[0];
}

export async function addRequirement(tx, lead, actor, { stage, text }) {
  const now = nowTs();
  const { insertId } = await tx.run(
    'INSERT INTO requirements (lead_id, stage, text, done, created_by, created_at) VALUES (?, ?, ?, 0, ?, ?)',
    [lead.id, stage, text, actor.id, now],
  );
  await tx.run('UPDATE leads SET updated_at = ? WHERE id = ?', [now, lead.id]);
  await logActivity(tx, lead.id, actor.id, REQUIREMENT_ADDED, {
    stage, message: `${actor.name} added a ${title(stage)} requirement`,
  });
  return requirementOut(await getRequirement(tx, lead.id, insertId));
}

export async function updateRequirement(tx, row, actor, { text, done }) {
  const now = nowTs();
  if (text !== undefined) await tx.run('UPDATE requirements SET text = ? WHERE id = ?', [text, row.id]);
  if (done !== undefined && done !== (Number(row.done) === 1)) {
    await tx.run('UPDATE requirements SET done = ?, done_by = ?, done_at = ? WHERE id = ?', [
      done ? 1 : 0, done ? actor.id : null, done ? now : null, row.id,
    ]);
    await logActivity(tx, row.lead_id, actor.id, REQUIREMENT_TOGGLED, {
      stage: row.stage, old: done ? 'open' : 'met', new: done ? 'met' : 'open',
      message: `${actor.name} ${done ? 'marked a requirement as met' : 'reopened a requirement'} on ${title(row.stage)}`,
    });
  }
  await tx.run('UPDATE leads SET updated_at = ? WHERE id = ?', [now, row.lead_id]);
  return requirementOut(await getRequirement(tx, row.lead_id, row.id));
}

export async function deleteRequirement(tx, row) {
  await tx.run('DELETE FROM requirements WHERE id = ?', [row.id]);
}
