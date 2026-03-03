"""add_all_crm_modules

Revision ID: a1b2c3d4e5f6
Revises: f17f1a000321
Create Date: 2026-03-03 12:00:00.000000+00:00
"""
from __future__ import annotations

from typing import Sequence, Union

import alembic.op as op
import sqlalchemy as sa


# ── Revision identifiers ──────────────────────────────────────────────────────
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f17f1a000321'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # ── org_settings ─────────────────────────────────────────────────────────
    op.create_table(
        'org_settings',
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('mod_attendance',    sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('mod_fees',          sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('mod_leads',         sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('mod_courses',       sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('mod_teachers',      sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('mod_exams',         sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('mod_communication', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('id',         sa.UUID(),                    nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True),  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),  server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id'),
    )
    op.create_index('ix_org_settings_organization_id', 'org_settings', ['organization_id'], unique=True)

    # ── password reset columns on users ──────────────────────────────────────
    op.add_column('users', sa.Column('reset_token',         sa.String(64),               nullable=True))
    op.add_column('users', sa.Column('reset_token_expires', sa.DateTime(timezone=True),  nullable=True))

    # ── leads ─────────────────────────────────────────────────────────────────
    op.create_table(
        'leads',
        sa.Column('full_name',          sa.String(255),  nullable=False),
        sa.Column('phone',              sa.String(20),   nullable=True),
        sa.Column('email',              sa.String(255),  nullable=True),
        sa.Column('course_interest',    sa.String(255),  nullable=True),
        sa.Column('source',             sa.Enum('walk_in','whatsapp','website','referral','social','other', name='leadsource'), nullable=False, server_default='other'),
        sa.Column('status',             sa.Enum('new','contacted','demo_scheduled','follow_up','converted','lost', name='leadstatus'), nullable=False, server_default='new'),
        sa.Column('next_followup_date', sa.Date(),       nullable=True),
        sa.Column('counselor_name',     sa.String(255),  nullable=True),
        sa.Column('notes',              sa.String(1000), nullable=True),
        sa.Column('id',                 sa.UUID(),       nullable=False),
        sa.Column('created_at',         sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at',         sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('organization_id',    sa.UUID(),       nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_leads_full_name',       'leads', ['full_name'],       unique=False)
    op.create_index('ix_leads_status',          'leads', ['status'],          unique=False)
    op.create_index('ix_leads_organization_id', 'leads', ['organization_id'], unique=False)

    # ── lead_notes ────────────────────────────────────────────────────────────
    op.create_table(
        'lead_notes',
        sa.Column('lead_id',         sa.UUID(),        nullable=False),
        sa.Column('content',         sa.String(2000),  nullable=False),
        sa.Column('author',          sa.String(255),   nullable=True),
        sa.Column('id',              sa.UUID(),        nullable=False),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('organization_id', sa.UUID(),        nullable=False),
        sa.ForeignKeyConstraint(['lead_id'],         ['leads.id'],         ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_lead_notes_lead_id',         'lead_notes', ['lead_id'],         unique=False)
    op.create_index('ix_lead_notes_organization_id', 'lead_notes', ['organization_id'], unique=False)

    # ── courses ───────────────────────────────────────────────────────────────
    op.create_table(
        'courses',
        sa.Column('name',            sa.String(255),  nullable=False),
        sa.Column('description',     sa.String(1000), nullable=True),
        sa.Column('duration_months', sa.Integer(),    nullable=True),
        sa.Column('fee_amount',      sa.Numeric(10,2),nullable=False, server_default='0'),
        sa.Column('is_active',       sa.Boolean(),    nullable=False, server_default='true'),
        sa.Column('id',              sa.UUID(),       nullable=False),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('organization_id', sa.UUID(),       nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_courses_name',            'courses', ['name'],            unique=False)
    op.create_index('ix_courses_organization_id', 'courses', ['organization_id'], unique=False)

    # ── batches ───────────────────────────────────────────────────────────────
    op.create_table(
        'batches',
        sa.Column('course_id',       sa.UUID(),       nullable=False),
        sa.Column('name',            sa.String(255),  nullable=False),
        sa.Column('schedule',        sa.String(500),  nullable=True),
        sa.Column('teacher_name',    sa.String(255),  nullable=True),
        sa.Column('capacity',        sa.Integer(),    nullable=True),
        sa.Column('status',          sa.Enum('active','inactive','completed', name='batchstatus'), nullable=False, server_default='active'),
        sa.Column('classroom',       sa.String(100),  nullable=True),
        sa.Column('start_date',      sa.Date(),       nullable=True),
        sa.Column('end_date',        sa.Date(),       nullable=True),
        sa.Column('is_online',       sa.Boolean(),    nullable=False, server_default='false'),
        sa.Column('id',              sa.UUID(),       nullable=False),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('organization_id', sa.UUID(),       nullable=False),
        sa.ForeignKeyConstraint(['course_id'],       ['courses.id'],       ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_batches_course_id',       'batches', ['course_id'],       unique=False)
    op.create_index('ix_batches_organization_id', 'batches', ['organization_id'], unique=False)

    # ── batch_students ────────────────────────────────────────────────────────
    op.create_table(
        'batch_students',
        sa.Column('batch_id',        sa.UUID(), nullable=False),
        sa.Column('student_id',      sa.UUID(), nullable=False),
        sa.Column('id',              sa.UUID(), nullable=False),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['batch_id'],       ['batches.id'],       ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'],     ['students.id'],      ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'],['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('batch_id', 'student_id', 'organization_id', name='uq_batch_student_org'),
    )
    op.create_index('ix_batch_students_batch_id',        'batch_students', ['batch_id'],        unique=False)
    op.create_index('ix_batch_students_student_id',      'batch_students', ['student_id'],      unique=False)
    op.create_index('ix_batch_students_organization_id', 'batch_students', ['organization_id'], unique=False)

    # ── exams ─────────────────────────────────────────────────────────────────
    op.create_table(
        'exams',
        sa.Column('title',           sa.String(255),  nullable=False),
        sa.Column('course_id',       sa.UUID(),       nullable=True),
        sa.Column('batch_id',        sa.UUID(),       nullable=True),
        sa.Column('exam_date',       sa.Date(),       nullable=False),
        sa.Column('max_marks',       sa.Numeric(6,2), nullable=False, server_default='100'),
        sa.Column('subject',         sa.String(100),  nullable=True),
        sa.Column('id',              sa.UUID(),       nullable=False),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('organization_id', sa.UUID(),       nullable=False),
        sa.ForeignKeyConstraint(['course_id'],       ['courses.id'],       ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['batch_id'],        ['batches.id'],       ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_exams_exam_date',       'exams', ['exam_date'],       unique=False)
    op.create_index('ix_exams_course_id',       'exams', ['course_id'],       unique=False)
    op.create_index('ix_exams_batch_id',        'exams', ['batch_id'],        unique=False)
    op.create_index('ix_exams_organization_id', 'exams', ['organization_id'], unique=False)

    # ── exam_results ──────────────────────────────────────────────────────────
    op.create_table(
        'exam_results',
        sa.Column('exam_id',         sa.UUID(),       nullable=False),
        sa.Column('student_id',      sa.UUID(),       nullable=False),
        sa.Column('marks_obtained',  sa.Numeric(6,2), nullable=False),
        sa.Column('remarks',         sa.String(500),  nullable=True),
        sa.Column('is_absent',       sa.Boolean(),    nullable=False, server_default='false'),
        sa.Column('id',              sa.UUID(),       nullable=False),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('organization_id', sa.UUID(),       nullable=False),
        sa.ForeignKeyConstraint(['exam_id'],         ['exams.id'],         ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'],      ['students.id'],      ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('exam_id', 'student_id', 'organization_id', name='uq_exam_result'),
    )
    op.create_index('ix_exam_results_exam_id',        'exam_results', ['exam_id'],        unique=False)
    op.create_index('ix_exam_results_student_id',     'exam_results', ['student_id'],     unique=False)
    op.create_index('ix_exam_results_organization_id','exam_results', ['organization_id'], unique=False)

    # ── notices ───────────────────────────────────────────────────────────────
    op.create_table(
        'notices',
        sa.Column('title',           sa.String(255),   nullable=False),
        sa.Column('body',            sa.String(5000),  nullable=False),
        sa.Column('audience',        sa.Enum('all','students','teachers','parents', name='noticeaudience'), nullable=False, server_default='all'),
        sa.Column('is_pinned',       sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('author',          sa.String(255),   nullable=True),
        sa.Column('id',              sa.UUID(),        nullable=False),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('organization_id', sa.UUID(),        nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notices_organization_id', 'notices', ['organization_id'], unique=False)


def downgrade() -> None:
    op.drop_table('notices')
    op.drop_table('exam_results')
    op.drop_table('exams')
    op.drop_table('batch_students')
    op.drop_table('batches')
    op.drop_table('courses')
    op.drop_table('lead_notes')
    op.drop_table('leads')
    op.drop_column('users', 'reset_token_expires')
    op.drop_column('users', 'reset_token')
    op.drop_table('org_settings')
    op.execute("DROP TYPE IF EXISTS noticeaudience")
    op.execute("DROP TYPE IF EXISTS batchstatus")
    op.execute("DROP TYPE IF EXISTS leadsource")
    op.execute("DROP TYPE IF EXISTS leadstatus")
