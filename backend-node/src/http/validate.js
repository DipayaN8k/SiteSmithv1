// Request validation that produces the same 422 body FastAPI did, because the website and dashboard
// read it: { detail: [ { type, loc: ["body", "email"], msg } ] }. A message that comes from one of our
// own rules starts with "Value error, " (the frontend strips that prefix).

/** Thrown inside a field's `check` function to report a rule violation. */
export class RuleError extends Error {}

export const err = (loc, type, msg) => ({ type, loc, msg });

const chars = (s) => [...s].length;

export function asObject(body, errors) {
  if (body === undefined) {
    errors.push(err(['body'], 'missing', 'Field required'));
    return null;
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    errors.push(err(['body'], 'model_attributes_type', 'Input should be a valid dictionary or object to extract fields from'));
    return null;
  }
  return body;
}

/**
 * Read one string field from a JSON body.
 * opts: required, nullable (null allowed), min, max (in characters), clean(value) -> string|null,
 *       check(value) (throw RuleError), default
 * Returns the value (undefined when absent and not required).
 */
export function readString(obj, key, errors, opts = {}) {
  const loc = ['body', key];
  const raw = obj[key];
  if (raw === undefined) {
    if (opts.required) errors.push(err(loc, 'missing', 'Field required'));
    return opts.default;
  }
  if (raw === null) {
    if (opts.nullable || !opts.required) return null;
    errors.push(err(loc, 'string_type', 'Input should be a valid string'));
    return undefined;
  }
  if (typeof raw !== 'string') {
    errors.push(err(loc, 'string_type', 'Input should be a valid string'));
    return undefined;
  }
  const value = opts.clean ? opts.clean(raw) : raw;
  if (value === null) return null;
  if (opts.min !== undefined && chars(value) < opts.min) {
    errors.push(err(loc, 'string_too_short', `String should have at least ${opts.min} character${opts.min === 1 ? '' : 's'}`));
    return undefined;
  }
  if (opts.max !== undefined && chars(value) > opts.max) {
    errors.push(err(loc, 'string_too_long', `String should have at most ${opts.max} characters`));
    return undefined;
  }
  if (opts.check) {
    try {
      opts.check(value);
    } catch (e) {
      if (!(e instanceof RuleError)) throw e;
      errors.push(err(loc, 'value_error', `Value error, ${e.message}`));
      return undefined;
    }
  }
  return value;
}

export function readBool(obj, key, errors, opts = {}) {
  const loc = ['body', key];
  const raw = obj[key];
  if (raw === undefined) {
    if (opts.required) errors.push(err(loc, 'missing', 'Field required'));
    return undefined;
  }
  if (typeof raw !== 'boolean') {
    errors.push(err(loc, 'bool_type', 'Input should be a valid boolean'));
    return undefined;
  }
  if (opts.check) {
    try {
      opts.check(raw);
    } catch (e) {
      if (!(e instanceof RuleError)) throw e;
      errors.push(err(loc, 'value_error', `Value error, ${e.message}`));
      return undefined;
    }
  }
  return raw;
}

const INT = /^[+-]?\d+$/;

/** An integer from a JSON number or digit string. Returns { ok, value }. */
function parseInteger(raw) {
  if (typeof raw === 'number' && Number.isInteger(raw)) return { ok: true, value: raw };
  if (typeof raw === 'string' && INT.test(raw.trim())) return { ok: true, value: Number.parseInt(raw.trim(), 10) };
  return { ok: false };
}

/** Optional-or-nullable integer body field. `required` means the key must be present (null still allowed). */
export function readInt(obj, key, errors, opts = {}) {
  const loc = ['body', key];
  const raw = obj[key];
  if (raw === undefined) {
    if (opts.required) errors.push(err(loc, 'missing', 'Field required'));
    return undefined;
  }
  if (raw === null) return null;
  const parsed = parseInteger(raw);
  if (!parsed.ok) {
    errors.push(err(loc, 'int_type', 'Input should be a valid integer'));
    return undefined;
  }
  return parsed.value;
}

/** Integer taken from the path or query string, with optional bounds. Mirrors FastAPI's messages. */
export function readIntParam(where, name, raw, errors, { ge, le, required = true, default: def } = {}) {
  const loc = [where, name];
  if (raw === undefined) {
    if (required && def === undefined) errors.push(err(loc, 'missing', 'Field required'));
    return def;
  }
  const parsed = parseInteger(raw);
  if (!parsed.ok) {
    errors.push(err(loc, 'int_parsing', 'Input should be a valid integer, unable to parse string as an integer'));
    return undefined;
  }
  if (ge !== undefined && parsed.value < ge) {
    errors.push(err(loc, 'greater_than_equal', `Input should be greater than or equal to ${ge}`));
    return undefined;
  }
  if (le !== undefined && parsed.value > le) {
    errors.push(err(loc, 'less_than_equal', `Input should be less than or equal to ${le}`));
    return undefined;
  }
  return parsed.value;
}

export function readLiteralParam(where, name, raw, allowed, errors) {
  if (raw === undefined) return undefined;
  if (!allowed.includes(raw)) {
    const quoted = allowed.map((a) => `'${a}'`);
    const list = `${quoted.slice(0, -1).join(', ')} or ${quoted[quoted.length - 1]}`;
    errors.push(err([where, name], 'literal_error', `Input should be ${list}`));
    return undefined;
  }
  return raw;
}

export function readStringParam(where, name, raw, errors, { max } = {}) {
  if (raw === undefined) return undefined;
  if (max !== undefined && chars(raw) > max) {
    errors.push(err([where, name], 'string_too_long', `String should have at most ${max} characters`));
    return undefined;
  }
  return raw;
}
