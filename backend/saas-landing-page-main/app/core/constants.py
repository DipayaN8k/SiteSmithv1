STAGES = ("backend", "frontend", "deployment")
STAGE_STATUSES = ("pending", "in_progress", "completed")
LEAD_STATUSES = STAGE_STATUSES

BUSINESS_TYPES = (
    "Retail",
    "Healthcare",
    "Education",
    "Manufacturing",
    "IT/Software",
    "Finance",
    "Real Estate",
    "Hospitality",
    "Other",
)

LEAD_CREATED = "lead_created"
STAGE_STATUS_CHANGED = "stage_status_changed"
LEAD_ASSIGNED = "lead_assigned"
STAGE_ASSIGNED = "stage_assigned"
COMMENT_ADDED = "comment_added"
ACTIONS = (LEAD_CREATED, STAGE_STATUS_CHANGED, LEAD_ASSIGNED, STAGE_ASSIGNED, COMMENT_ADDED)

MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_LENGTH = 128
