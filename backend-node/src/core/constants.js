export const STAGES = ['backend', 'frontend', 'deployment'];
export const STAGE_STATUSES = ['pending', 'in_progress', 'completed'];

export const BUSINESS_TYPES = [
  'Retail',
  'Healthcare',
  'Education',
  'Manufacturing',
  'IT/Software',
  'Finance',
  'Real Estate',
  'Hospitality',
  'Other',
];

export const LEAD_CREATED = 'lead_created';
export const STAGE_STATUS_CHANGED = 'stage_status_changed';
export const LEAD_ASSIGNED = 'lead_assigned';
export const STAGE_ASSIGNED = 'stage_assigned';
export const COMMENT_ADDED = 'comment_added';
export const REQUIREMENT_ADDED = 'requirement_added';
export const REQUIREMENT_TOGGLED = 'requirement_toggled';
export const ACTIONS = [
  LEAD_CREATED,
  STAGE_STATUS_CHANGED,
  LEAD_ASSIGNED,
  STAGE_ASSIGNED,
  COMMENT_ADDED,
  REQUIREMENT_ADDED,
  REQUIREMENT_TOGGLED,
];

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
