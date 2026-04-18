"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-18 02:15:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("messenger_psid", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_messenger_psid"), "users", ["messenger_psid"], unique=True)

    op.create_table(
        "webhook_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("event_key", sa.String(length=255), nullable=False),
        sa.Column("sender_psid", sa.String(length=255), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("char_length(provider) > 0", name="ck_webhook_events_provider_not_blank"),
        sa.CheckConstraint("char_length(event_key) > 0", name="ck_webhook_events_event_key_not_blank"),
        sa.CheckConstraint("char_length(sender_psid) > 0", name="ck_webhook_events_sender_psid_not_blank"),
        sa.CheckConstraint("char_length(status) > 0", name="ck_webhook_events_status_not_blank"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_webhook_events_event_key"), "webhook_events", ["event_key"], unique=True)
    op.create_index(
        "ix_webhook_events_sender_psid_received_at",
        "webhook_events",
        ["sender_psid", "received_at"],
        unique=False,
    )

    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default=sa.text("'USD'"), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
        sa.CheckConstraint("char_length(currency) = 3", name="ck_expenses_currency_length"),
        sa.CheckConstraint("char_length(category) > 0", name="ck_expenses_category_not_blank"),
        sa.CheckConstraint("char_length(source_text) > 0", name="ck_expenses_source_text_not_blank"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_expenses_user_id_occurred_at",
        "expenses",
        ["user_id", "occurred_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_expenses_user_id_occurred_at", table_name="expenses")
    op.drop_table("expenses")
    op.drop_index("ix_webhook_events_sender_psid_received_at", table_name="webhook_events")
    op.drop_index(op.f("ix_webhook_events_event_key"), table_name="webhook_events")
    op.drop_table("webhook_events")
    op.drop_index(op.f("ix_users_messenger_psid"), table_name="users")
    op.drop_table("users")
