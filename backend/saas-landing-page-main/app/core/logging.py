import logging

# Audit lines for team-account changes go here, not into activity_log (which is lead-scoped).
audit_logger = logging.getLogger("app.audit")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
