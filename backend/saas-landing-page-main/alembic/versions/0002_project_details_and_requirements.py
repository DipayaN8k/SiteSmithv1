"""store project details on leads, add per-stage requirements

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-03
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("project_type", sa.String(100)))
    op.add_column("leads", sa.Column("budget", sa.String(100)))
    op.add_column("leads", sa.Column("message", sa.Text()))

    op.create_table(
        "requirements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id"), nullable=False),
        sa.Column("stage", sa.String(20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("done", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("done_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("done_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_requirements_lead_id", "requirements", ["lead_id"])


def downgrade() -> None:
    op.drop_index("ix_requirements_lead_id", table_name="requirements")
    op.drop_table("requirements")
    with op.batch_alter_table("leads") as batch:
        batch.drop_column("message")
        batch.drop_column("budget")
        batch.drop_column("project_type")
