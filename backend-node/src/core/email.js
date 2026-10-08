import dns from 'node:dns/promises';
import { domainToASCII } from 'node:url';

// Typo domains that are real, registered and accept mail, so a DNS check can't catch them.
export const TYPO_DOMAINS = {
  'gamil.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.cm': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'iclod.com': 'icloud.com',
};

// Domains that can never receive real mail (the same list the Python email validator rejects).
const SPECIAL_USE = ['arpa', 'invalid', 'local', 'localhost', 'onion', 'test'];

const LOCAL_OK =/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const LABEL_OK = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Syntax check, like pydantic's EmailStr. Returns { ok: true, email } (domain lower-cased, IDN as
 * punycode) or { ok: false, reason }.
 */
export function parseEmail(raw) {
  const value = String(raw).trim();
  const at = value.lastIndexOf('@');
  if (at < 0) return { ok: false, reason: 'An email address must have an @-sign.' };
  const local = value.slice(0, at);
  const domainRaw = value.slice(at + 1);
  if (value.length > 254) return { ok: false, reason: 'The email address is too long.' };
  if (!local) return { ok: false, reason: 'There must be something before the @-sign.' };
  if (local.length > 64) return { ok: false, reason: 'The part before the @-sign is too long.' };
  if (!LOCAL_OK.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return { ok: false, reason: 'The part before the @-sign contains invalid characters.' };
  }
  const domain = domainToASCII(domainRaw.toLowerCase());
  if (!domain || domain.length > 253) return { ok: false, reason: 'The part after the @-sign is not valid.' };
  const labels = domain.split('.');
  if (labels.length < 2) return { ok: false, reason: 'The part after the @-sign is not valid. It should have a period.' };
  if (!labels.every((l) => LABEL_OK.test(l))) return { ok: false, reason: 'The part after the @-sign is not valid.' };
  if (/^\d+$/.test(labels[labels.length - 1])) return { ok: false, reason: 'The part after the @-sign is not valid.' };
  if (SPECIAL_USE.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return { ok: false, reason: 'The part after the @-sign is a special-use or reserved name that cannot be used with email.' };
  }
  return { ok: true, email: `${local}@${domain}` };
}

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms)),
  ]);

const NO_ANSWER = new Set(['ENODATA', 'ENOTFOUND', 'NOTFOUND', 'NXDOMAIN']);

/**
 * Does the domain exist and accept mail (MX, or A/AAAA as a fallback)? Resolves to true/false.
 * A lookup that fails for other reasons (timeout, DNS outage) resolves to true: a DNS problem on
 * our side must never block a real lead.
 */
export async function domainAcceptsMail(domain, resolver = dns, timeoutMs = 5000) {
  try {
    const mx = await withTimeout(resolver.resolveMx(domain), timeoutMs);
    if (mx.length === 1 && (mx[0].exchange === '' || mx[0].exchange === '.')) return false; // null MX
    if (mx.length > 0) return true;
  } catch (err) {
    if (!NO_ANSWER.has(err.code)) return true; // lookup problem: fail open
  }
  for (const lookup of ['resolve4', 'resolve6']) {
    try {
      const records = await withTimeout(resolver[lookup](domain), timeoutMs);
      if (records.length > 0) return true;
    } catch (err) {
      if (!NO_ANSWER.has(err.code)) return true;
    }
  }
  return false;
}
