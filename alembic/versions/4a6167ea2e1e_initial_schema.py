"""Initial schema for users, applicants, assessments, and audit_logs

Revision ID: 4a6167ea2e1e
Revises: 
Create Date: 2026-09-07 09:11:26.130232

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4a6167ea2e1e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_created_at'), 'users', ['created_at'], unique=False)

    # Applicants table
    op.create_table(
        'applicants',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('status_checking_account', sa.String(length=10), nullable=False),
        sa.Column('duration_in_months', sa.Integer(), nullable=False),
        sa.Column('credit_history', sa.String(length=10), nullable=False),
        sa.Column('purpose', sa.String(length=10), nullable=False),
        sa.Column('credit_amount', sa.Integer(), nullable=False),
        sa.Column('savings_account', sa.String(length=10), nullable=False),
        sa.Column('present_employment_since', sa.String(length=10), nullable=False),
        sa.Column('installment_rate', sa.Integer(), nullable=False),
        sa.Column('personal_status_sex', sa.String(length=10), nullable=False),
        sa.Column('other_debtors_guarantors', sa.String(length=10), nullable=False),
        sa.Column('present_residence_since', sa.Integer(), nullable=False),
        sa.Column('property', sa.String(length=10), nullable=False),
        sa.Column('age_in_years', sa.Integer(), nullable=False),
        sa.Column('other_installment_plans', sa.String(length=10), nullable=False),
        sa.Column('housing', sa.String(length=10), nullable=False),
        sa.Column('existing_credits', sa.Integer(), nullable=False),
        sa.Column('job', sa.String(length=10), nullable=False),
        sa.Column('num_people_liable', sa.Integer(), nullable=False),
        sa.Column('telephone', sa.String(length=10), nullable=False),
        sa.Column('foreign_worker', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_applicants_created_at'), 'applicants', ['created_at'], unique=False)

    # Assessments table
    op.create_table(
        'assessments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('applicant_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('default_probability', sa.Float(), nullable=False),
        sa.Column('prediction', sa.Integer(), nullable=False),
        sa.Column('risk_category', sa.String(length=50), nullable=False),
        sa.Column('decision', sa.String(length=100), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['applicant_id'], ['applicants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assessments_applicant_id'), 'assessments', ['applicant_id'], unique=False)
    op.create_index(op.f('ix_assessments_created_at'), 'assessments', ['created_at'], unique=False)
    op.create_index(op.f('ix_assessments_prediction'), 'assessments', ['prediction'], unique=False)
    op.create_index(op.f('ix_assessments_risk_category'), 'assessments', ['risk_category'], unique=False)

    # Audit Logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('assessment_id', sa.String(length=36), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_assessment_id'), 'audit_logs', ['assessment_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('assessments')
    op.drop_table('applicants')
    op.drop_table('users')
