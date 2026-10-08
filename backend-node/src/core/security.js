import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './constants.js';
import { ServiceError } from './errors.js';

const scrypt = promisify(crypto.scrypt);

// scrypt ships with Node (no native packages to build on shared hosting). N=2^15, r=8 uses about 32 MB
// per hash and takes roughly 100 ms. Stored as: scrypt$N$r$p$salt(base64)$hash(base64)
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 64;
const maxmemFor = (n, r) => 128 * n * r * 2;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: maxmemFor(N, R) });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, n, r, p, salt, hash] = String(stored).split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'base64');
    const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: maxmemFor(Number(n), Number(r)),
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

let dummyHash;
/** Spend the same time as a real check so unknown emails are not detectable by timing. */
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword('not-a-real-password');
  await verifyPassword(password, dummyHash);
}

export function validatePasswordStrength(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ServiceError(422, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ServiceError(422, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }
}

// ---- JWT (HS256), implemented with node:crypto so there is nothing to install ----

const b64url = (input) => Buffer.from(input).toString('base64url');
const sign = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest();

export function createAccessToken(userId, secret, expireMinutes, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: String(userId), iat, exp: iat + expireMinutes * 60 }));
  return `${header}.${payload}.${b64url(sign(`${header}.${payload}`, secret))}`;
}

/** The user id inside a valid, unexpired token, otherwise null. */
export function decodeAccessToken(token, secret, now = Date.now()) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const head = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (head.alg !== 'HS256') return null; // also rejects "none"
    const given = Buffer.from(signature, 'base64url');
    const expected = sign(`${header}.${payload}`, secret);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(now / 1000)) return null;
    const id = Number(claims.sub);
    return typeof claims.sub === 'string' && Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}
