import { ServiceError } from '../core/errors.js';
import { audit } from '../core/logger.js';
import { stripHtml } from '../core/sanitize.js';
import { hashPassword, validatePasswordStrength } from '../core/security.js';
import { nowTs, toIso } from '../core/time.js';

export const normalizeEmail = (email) => String(email).trim().toLowerCase();

export async function getByEmail(db, email) {
  const rows = await db.query('SELECT * FROM users WHERE email = ?', [normalizeEmail(email)]);
  return rows[0] ?? null;
}

export async function getById(db, id) {
  const rows = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] ?? null;
}

async function requireUser(db, email) {
  const user = await getByEmail(db, email);
  if (!user) throw new ServiceError(404, `No user with email ${normalizeEmail(email)}`);
  return user;
}

export const isActive = (user) => Number(user.is_active) === 1;

/** The public shape of a user (never includes the password hash). */
export const userOut = (u) => ({ id: u.id, name: u.name, email: u.email, created_at: toIso(u.created_at) });

/** Checks shared by createUser and the "print SQL" mode of the account script. Returns clean values. */
export function checkNewUser({ name, email, password }) {
  const cleanName = stripHtml(String(name ?? ''));
  const cleanEmail = normalizeEmail(email ?? '');
  if (!cleanName) throw new ServiceError(422, 'Name is required');
  if (!cleanEmail.includes('@') || cleanEmail.length > 254) throw new ServiceError(422, 'A valid email is required');
  validatePasswordStrength(password);
  return { name: cleanName, email: cleanEmail };
}

export async function createUser(db, input) {
  const { name, email } = checkNewUser(input);
  if (await getByEmail(db, email)) throw new ServiceError(409, `A user with email ${email} already exists`);
  const result = await db.run(
    'INSERT INTO users (name, email, password_hash, is_active, created_at) VALUES (?, ?, ?, 1, ?)',
    [name, email, await hashPassword(input.password), nowTs()],
  );
  audit(`user_created email=${email} id=${result.insertId}`);
  return getById(db, result.insertId);
}

export async function resetPassword(db, email, password) {
  const user = await requireUser(db, email);
  validatePasswordStrength(password);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(password), user.id]);
  audit(`password_reset email=${user.email} id=${user.id}`);
  return getById(db, user.id);
}

export async function setActive(db, email, active) {
  const user = await requireUser(db, email);
  await db.run('UPDATE users SET is_active = ? WHERE id = ?', [active ? 1 : 0, user.id]);
  audit(`${active ? 'user_activated' : 'user_deactivated'} email=${user.email} id=${user.id}`);
  return getById(db, user.id);
}

export const deactivateUser = (db, email) => setActive(db, email, false);

export function listUsers(db) {
  return db.query('SELECT * FROM users ORDER BY id');
}
