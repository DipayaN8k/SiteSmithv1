// Every endpoint, with the same paths, status codes and messages the Python backend had.
// See docs/FRONTEND_API.md for the contract the website and dashboard rely on.
import { STAGE_STATUSES } from '../core/constants.js';
import { ServiceError } from '../core/errors.js';
import { audit } from '../core/logger.js';
import {
  burnPasswordCheck, createAccessToken, hashPassword, validatePasswordStrength, verifyPassword,
} from '../core/security.js';
import {
  parseChangePassword, parseComment, parseContact, parseLeadUpdate, parseLogin, parseRequirementIn,
  parseRequirementUpdate, parseStageUpdate,
} from '../http/schemas.js';
import { readIntParam, readLiteralParam, readStringParam } from '../http/validate.js';
import { activityFeed } from '../services/activity.js';
import * as leads from '../services/leads.js';
import { getByEmail, isActive, listUsers, normalizeEmail, userOut } from '../services/users.js';

const THANKS = 'Thanks, your request has been received. Our team will get back to you.';
const leadIdParam = (raw, errors) => ({ lead_id: readIntParam('path', 'lead_id', raw.lead_id, errors) });

/** The updated lead plus ordering warnings, as both PATCH endpoints respond. */
async function mutationResponse(db, leadId) {
  const lead = await leads.getLead(db, leadId);
  return {
    lead: await leads.summarize(db, lead),
    warnings: leads.stageWarnings(Object.fromEntries(lead.stages.map((s) => [s.stage, s.status]))),
  };
}

export function registerRoutes(router, { config, db, resolver }) {
  // ---------- public ----------
  router.add('GET', '/health', { handler: async () => ({ json: { status: 'ok' } }) });

  router.add('POST', '/api/contact', {
    limit: 'contact',
    body: (json) => parseContact(json, { checkDeliverability: config.emailCheckDeliverability, resolver }),
    handler: async ({ body }) => {
      if (body.website) {
        // Honeypot filled: pretend it worked, store nothing.
        console.log(`${new Date().toISOString()} INFO app.contact honeypot triggered; submission discarded`);
        return { status: 201, json: { message: THANKS } };
      }
      await db.transaction((tx) => leads.createLead(tx, body));
      return { status: 201, json: { message: THANKS } };
    },
  });

  router.add('POST', '/auth/login', {
    limit: 'login',
    body: (json) => parseLogin(json),
    handler: async ({ body }) => {
      const user = await getByEmail(db, normalizeEmail(body.email));
      if (!user) await burnPasswordCheck(body.password);
      if (!user || !(await verifyPassword(body.password, user.password_hash)) || !isActive(user)) {
        throw new ServiceError(401, 'Invalid email or password');
      }
      return { json: { access_token: createAccessToken(user.id, config.jwtSecret, config.jwtExpireMinutes), token_type: 'bearer' } };
    },
  });

  // ---------- signed-in team members ----------
  router.add('GET', '/auth/me', { auth: true, handler: async ({ user }) => ({ json: userOut(user) }) });

  router.add('POST', '/auth/change-password', {
    auth: true,
    body: (json) => parseChangePassword(json),
    handler: async ({ user, body }) => {
      if (!(await verifyPassword(body.current_password, user.password_hash))) {
        throw new ServiceError(400, 'Current password is incorrect');
      }
      if (body.new_password === body.current_password) {
        throw new ServiceError(422, 'New password must differ from the current one');
      }
      validatePasswordStrength(body.new_password);
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(body.new_password), user.id]);
      audit(`password_changed email=${user.email} id=${user.id}`);
      return { status: 204 };
    },
  });

  router.add('GET', '/api/users', {
    auth: true,
    handler: async () => ({
      json: (await listUsers(db)).filter(isActive).map((u) => ({ id: u.id, name: u.name })), // names only, no emails
    }),
  });

  // ---------- leads ----------
  router.add('GET', '/api/leads', {
    auth: true,
    query: (raw, errors) => ({
      status: readLiteralParam('query', 'status', raw.status, STAGE_STATUSES, errors),
      q: readStringParam('query', 'q', raw.q, errors, { max: 200 }),
      page: readIntParam('query', 'page', raw.page, errors, { ge: 1, required: false, default: 1 }),
      pageSize: readIntParam('query', 'page_size', raw.page_size, errors, { ge: 1, le: 100, required: false, default: 20 }),
    }),
    handler: async ({ query }) => {
      const { items, total } = await leads.listLeads(db, query);
      return { json: { items, total, page: query.page, page_size: query.pageSize } };
    },
  });

  router.add('GET', '/api/leads/:lead_id', {
    auth: true,
    params: leadIdParam,
    handler: async ({ params }) => ({ json: await leads.leadDetail(db, params.lead_id) }),
  });

  router.add('PATCH', '/api/leads/:lead_id', {
    auth: true,
    params: leadIdParam,
    body: (json) => parseLeadUpdate(json),
    handler: async ({ params, body, user }) => {
      const lead = await leads.getLead(db, params.lead_id);
      await db.transaction((tx) => leads.assignLead(tx, lead, user, body.assigned_to));
      return { json: await mutationResponse(db, params.lead_id) };
    },
  });

  router.add('DELETE', '/api/leads/:lead_id', {
    auth: true,
    params: leadIdParam,
    handler: async ({ params }) => {
      const lead = await leads.getLead(db, params.lead_id);
      await db.transaction((tx) => leads.deleteLead(tx, lead));
      return { status: 204 };
    },
  });

  router.add('PATCH', '/api/leads/:lead_id/stages/:stage', {
    auth: true,
    params: (raw, errors) => ({ ...leadIdParam(raw, errors), stage: raw.stage }),
    body: (json) => parseStageUpdate(json),
    handler: async ({ params, body, user }) => {
      const lead = await leads.getLead(db, params.lead_id);
      await db.transaction((tx) =>
        leads.updateStage(tx, lead, params.stage, user, {
          status: body.status, setAssignee: body.setAssignee, assignedTo: body.assigned_to,
        }),
      );
      return { json: await mutationResponse(db, params.lead_id) };
    },
  });

  router.add('POST', '/api/leads/:lead_id/comments', {
    auth: true,
    params: leadIdParam,
    body: (json) => parseComment(json),
    handler: async ({ params, body, user }) => {
      const lead = await leads.getLead(db, params.lead_id);
      return { status: 201, json: await db.transaction((tx) => leads.addComment(tx, lead, user, body)) };
    },
  });

  // ---------- client requirements checklist ----------
  const requirementParams = (raw, errors) => ({
    ...leadIdParam(raw, errors),
    requirement_id: readIntParam('path', 'requirement_id', raw.requirement_id, errors),
  });

  router.add('POST', '/api/leads/:lead_id/requirements', {
    auth: true,
    params: leadIdParam,
    body: (json) => parseRequirementIn(json),
    handler: async ({ params, body, user }) => {
      const lead = await leads.getLead(db, params.lead_id);
      return { status: 201, json: await db.transaction((tx) => leads.addRequirement(tx, lead, user, body)) };
    },
  });

  router.add('PATCH', '/api/leads/:lead_id/requirements/:requirement_id', {
    auth: true,
    params: requirementParams,
    body: (json) => parseRequirementUpdate(json),
    handler: async ({ params, body, user }) => {
      const row = await leads.getRequirement(db, params.lead_id, params.requirement_id);
      return { json: await db.transaction((tx) => leads.updateRequirement(tx, row, user, body)) };
    },
  });

  router.add('DELETE', '/api/leads/:lead_id/requirements/:requirement_id', {
    auth: true,
    params: requirementParams,
    handler: async ({ params }) => {
      const row = await leads.getRequirement(db, params.lead_id, params.requirement_id);
      await db.transaction((tx) => leads.deleteRequirement(tx, row));
      return { status: 204 };
    },
  });

  // ---------- activity feed ----------
  router.add('GET', '/api/activity', {
    auth: true,
    query: (raw, errors) => ({
      leadId: readIntParam('query', 'lead_id', raw.lead_id, errors, { required: false }),
      userId: readIntParam('query', 'user_id', raw.user_id, errors, { required: false }),
      limit: readIntParam('query', 'limit', raw.limit, errors, { ge: 1, le: 100, required: false, default: 50 }),
      before: readIntParam('query', 'before', raw.before, errors, { ge: 1, required: false }),
    }),
    handler: async ({ query }) => ({ json: await activityFeed(db, query) }),
  });
}
