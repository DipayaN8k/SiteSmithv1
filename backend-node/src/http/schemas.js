// Request bodies, one parser per endpoint. Each returns { value, errors }; the app answers 422 when
// `errors` is not empty. Unknown keys are ignored. These are the rules the Python backend had.
import { BUSINESS_TYPES, STAGE_STATUSES, STAGES } from '../core/constants.js';
import { TYPO_DOMAINS, domainAcceptsMail, parseEmail } from '../core/email.js';
import { stripHtml } from '../core/sanitize.js';
import { RuleError, asObject, err, readBool, readInt, readString } from './validate.js';

const PHONE_RE = /^[0-9+\-() .]{5,30}$/;

/** Cleaning for optional text: blank means "not provided". */
const cleanOptional = (v) => {
  const t = stripHtml(v);
  return t === '' ? null : t;
};

export async function parseContact(body, { checkDeliverability, resolver }) {
  const errors = [];
  const o = asObject(body, errors);
  if (!o) return { errors };

  const full_name = readString(o, 'full_name', errors, { required: true, min: 1, max: 200, clean: (v) => stripHtml(v) });

  // email: syntax first, then known typo domains, then a DNS check
  let email;
  if (o.email === undefined) errors.push(err(['body', 'email'], 'missing', 'Field required'));
  else if (typeof o.email !== 'string') errors.push(err(['body', 'email'], 'string_type', 'Input should be a valid string'));
  else {
    const parsed = parseEmail(o.email);
    if (!parsed.ok) errors.push(err(['body', 'email'], 'value_error', `value is not a valid email address: ${parsed.reason}`));
    else {
      const domain = parsed.email.split('@')[1];
      if (TYPO_DOMAINS[domain]) {
        errors.push(err(['body', 'email'], 'value_error', `Value error, Did you mean @${TYPO_DOMAINS[domain]}? Check your email for typos.`));
      } else if (checkDeliverability && !(await domainAcceptsMail(domain, resolver))) {
        errors.push(err(['body', 'email'], 'value_error', "Value error, That email domain can't receive mail. Check for typos."));
      } else {
        email = parsed.email;
      }
    }
  }

  const phone = readString(o, 'phone', errors, {
    max: 30,
    clean: cleanOptional,
    check: (v) => {
      if (!PHONE_RE.test(v)) throw new RuleError('Enter a valid phone number');
    },
  });
  const business_type = readString(o, 'business_type', errors, {
    required: true,
    check: (v) => {
      if (!BUSINESS_TYPES.includes(v)) throw new RuleError(`business_type must be one of: ${BUSINESS_TYPES.join(', ')}`);
    },
  });
  let business_type_other = readString(o, 'business_type_other', errors, { max: 200, clean: cleanOptional });
  const project_type = readString(o, 'project_type', errors, { max: 100, clean: cleanOptional });
  const budget = readString(o, 'budget', errors, { max: 100, clean: cleanOptional });
  const message = readString(o, 'message', errors, { max: 2000, clean: (v) => stripHtml(v, { multiline: true }) || null });
  const consent = readBool(o, 'consent', errors, {
    required: true,
    check: (v) => {
      if (v !== true) throw new RuleError('Consent is required');
    },
  });
  const website = readString(o, 'website', errors, {}); // honeypot: real users leave it empty

  if (errors.length === 0) {
    if (business_type === 'Other') {
      if (!business_type_other) {
        errors.push(err(['body'], 'value_error', 'Value error, business_type_other is required when business_type is Other'));
      }
    } else {
      business_type_other = null;
    }
  }
  if (errors.length) return { errors };
  return {
    errors,
    value: {
      full_name, email, phone: phone ?? null, business_type, business_type_other: business_type_other ?? null,
      project_type: project_type ?? null, budget: budget ?? null, message: message ?? null, consent, website,
    },
  };
}

export function parseLogin(body) {
  const errors = [];
  const o = asObject(body, errors);
  if (!o) return { errors };
  const email = readString(o, 'email', errors, { required: true, max: 254 });
  const password = readString(o, 'password', errors, { required: true, max: 128 });
  return errors.length ? { errors } : { errors, value: { email, password } };
}

export function parseChangePassword(body) {
  const errors = [];
  const o = asObject(body, errors);
  if (!o) return { errors };
  const current_password = readString(o, 'current_password', errors, { required: true, max: 128 });
  const new_password = readString(o, 'new_password', errors, { required: true, max: 128 });
  return errors.length ? { errors } : { errors, value: { current_password, new_password } };
}

export function parseLeadUpdate(body) {
  const errors = [];
  const o = asObject(body, errors);
  if (!o) return { errors };
  const assigned_to = readInt(o, 'assigned_to', errors, { required: true });
  return errors.length ? { errors } : { errors, value: { assigned_to } };
}

export function parseStageUpdate(body) {
  const errors = [];
  const o = asObject(body, errors);
  if (!o) return { errors };
  const hasStatus = 'status' in o;
  const hasAssignee = 'assigned_to' in o;
  let status;
  if (hasStatus && o.status !== null) {
    status = readString(o, 'status', errors, {
      check: (v) => {
        if (!STAGE_STATUSES.includes(v)) throw new RuleError(`status must be one of: ${STAGE_STATUSES.join(', ')}`);
      },
    });
  }
  const assigned_to = hasAssignee ? readInt(o, 'assigned_to', errors) : undefined;
  if (errors.length === 0) {
    if (!hasStatus && !hasAssignee) errors.push(err(['body'], 'value_error', 'Value error, Provide status and/or assigned_to'));
    else if (hasStatus && o.status === null) errors.push(err(['body'], 'value_error', 'Value error, status cannot be null'));
  }
  return errors.length ? { errors } : { errors, value: { status, setAssignee: hasAssignee, assigned_to } };
}

const multiline = (v) => stripHtml(v, { multiline: true });

export function parseComment(body) {
  const errors = [];
  const o = asObject(body, errors);
  if (!o) return { errors };
  const text = readString(o, 'body', errors, { required: true, min: 1, max: 2000, clean: multiline });
  const stage = readString(o, 'stage', errors, { nullable: true });
  return errors.length ? { errors } : { errors, value: { body: text, stage: stage ?? null } };
}

export function parseRequirementIn(body) {
  const errors = [];
  const o = asObject(body, errors);
  if (!o) return { errors };
  const stage = readString(o, 'stage', errors, {
    required: true,
    check: (v) => {
      if (!STAGES.includes(v)) throw new RuleError(`stage must be one of: ${STAGES.join(', ')}`);
    },
  });
  const text = readString(o, 'text', errors, { required: true, min: 1, max: 1000, clean: multiline });
  return errors.length ? { errors } : { errors, value: { stage, text } };
}

export function parseRequirementUpdate(body) {
  const errors = [];
  const o = asObject(body, errors);
  if (!o) return { errors };
  const text = o.text === undefined || o.text === null ? undefined : readString(o, 'text', errors, { min: 1, max: 1000, clean: multiline });
  const done = o.done === undefined || o.done === null ? undefined : readBool(o, 'done', errors);
  if (errors.length === 0 && text === undefined && done === undefined) {
    errors.push(err(['body'], 'value_error', 'Value error, Provide text and/or done'));
  }
  return errors.length ? { errors } : { errors, value: { text, done } };
}
