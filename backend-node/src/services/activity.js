import { ACTIONS } from '../core/constants.js';
import { nowTs, toIso } from '../core/time.js';

/**
 * The only way activity rows are written. `tx` is the caller's transaction handle, so the entry
 * commits (or rolls back) together with the change it describes. userId null = system/public action.
 */
export async function logActivity(tx, leadId, userId, action, { stage = null, old = null, new: next = null, message }) {
  if (!ACTIONS.includes(action)) throw new Error(`Unknown activity action: ${action}`);
  const result = await tx.run(
    `INSERT INTO activity_log (lead_id, user_id, action, stage, old_value, new_value, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [leadId, userId, action, stage, old, next, String(message).slice(0, 500), nowTs()],
  );
  return result.insertId;
}

export function activityOut(row) {
  return {
    id: row.id,
    lead_id: row.lead_id,
    user_id: row.user_id,
    user_name: row.user_name ?? null,
    action: row.action,
    stage: row.stage,
    old_value: row.old_value,
    new_value: row.new_value,
    message: row.message,
    created_at: toIso(row.created_at),
  };
}

export async function activityFeed(db, { leadId, userId, limit, before }) {
  const where = [];
  const params = [];
  if (leadId != null) { where.push('a.lead_id = ?'); params.push(leadId); }
  if (userId != null) { where.push('a.user_id = ?'); params.push(userId); }
  if (before != null) { where.push('a.id < ?'); params.push(before); }
  const rows = await db.query(
    `SELECT a.*, u.name AS user_name FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY a.id DESC LIMIT ?`,
    [...params, limit + 1],
  );
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  return { items: page.map(activityOut), next_before: hasMore ? page[page.length - 1].id : null };
}
