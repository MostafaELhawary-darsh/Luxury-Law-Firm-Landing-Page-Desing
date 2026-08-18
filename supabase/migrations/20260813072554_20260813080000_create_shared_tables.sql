-- ============================================================================
-- Migration: create_shared_tables
-- Creates shared_audit_logs, shared_internal_messages, shared_task_tickets
-- These tables back the shared domain ORM models that previously had no
-- migration. Each table is protected with row-level security (RLS) using
-- auth.uid() ownership checks.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typname = 'task_priority') THEN
    CREATE TYPE public.task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typname = 'task_status') THEN
    CREATE TYPE public.task_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- ===========================================================================
-- Table: shared_audit_logs
--   Immutable audit trail. Rows are owned by user_id; only inserts/selects
--   are meaningful (the ORM marks this model as immutable).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.shared_audit_logs (
  id          VARCHAR(36) PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL,
  module_id   VARCHAR(16) NOT NULL,
  action      VARCHAR(255) NOT NULL,
  resource_id VARCHAR(36),
  timestamp   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address  VARCHAR(45),
  metadata    JSONB
);

CREATE INDEX IF NOT EXISTS ix_shared_audit_logs_user_id   ON public.shared_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS ix_shared_audit_logs_module_id ON public.shared_audit_logs (module_id);
CREATE INDEX IF NOT EXISTS ix_shared_audit_logs_timestamp ON public.shared_audit_logs (timestamp);

ALTER TABLE public.shared_audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: a user may read their own audit entries.
DROP POLICY IF EXISTS "shared_audit_logs_select" ON public.shared_audit_logs;
CREATE POLICY "shared_audit_logs_select"
  ON public.shared_audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- INSERT: a user may create audit entries for themselves.
DROP POLICY IF EXISTS "shared_audit_logs_insert" ON public.shared_audit_logs;
CREATE POLICY "shared_audit_logs_insert"
  ON public.shared_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- UPDATE: audit logs are immutable. No user (not even the owner) may update.
DROP POLICY IF EXISTS "shared_audit_logs_update" ON public.shared_audit_logs;
CREATE POLICY "shared_audit_logs_update"
  ON public.shared_audit_logs
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- DELETE: audit logs are immutable. No user (not even the owner) may delete.
DROP POLICY IF EXISTS "shared_audit_logs_delete" ON public.shared_audit_logs;
CREATE POLICY "shared_audit_logs_delete"
  ON public.shared_audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- ===========================================================================
-- Table: shared_internal_messages
--   Private messages between users. A message is visible to its sender and
--   recipient; only the recipient can mark it read; either party may delete
--   their copy.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.shared_internal_messages (
  id           VARCHAR(36) PRIMARY KEY,
  sender_id    VARCHAR(36) NOT NULL,
  recipient_id VARCHAR(36) NOT NULL,
  subject      VARCHAR(512) NOT NULL,
  body         VARCHAR(10000) NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  read_at      TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_shared_internal_messages_sender_id    ON public.shared_internal_messages (sender_id);
CREATE INDEX IF NOT EXISTS ix_shared_internal_messages_recipient_id ON public.shared_internal_messages (recipient_id);

ALTER TABLE public.shared_internal_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: sender or recipient can read the message.
DROP POLICY IF EXISTS "shared_internal_messages_select" ON public.shared_internal_messages;
CREATE POLICY "shared_internal_messages_select"
  ON public.shared_internal_messages
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid()::text OR recipient_id = auth.uid()::text);

-- INSERT: only the sender can create a message they authored.
DROP POLICY IF EXISTS "shared_internal_messages_insert" ON public.shared_internal_messages;
CREATE POLICY "shared_internal_messages_insert"
  ON public.shared_internal_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid()::text);

-- UPDATE: recipient can update (e.g. mark as read); sender may NOT mutate.
DROP POLICY IF EXISTS "shared_internal_messages_update" ON public.shared_internal_messages;
CREATE POLICY "shared_internal_messages_update"
  ON public.shared_internal_messages
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid()::text)
  WITH CHECK (recipient_id = auth.uid()::text);

-- DELETE: sender or recipient can delete the message.
DROP POLICY IF EXISTS "shared_internal_messages_delete" ON public.shared_internal_messages;
CREATE POLICY "shared_internal_messages_delete"
  ON public.shared_internal_messages
  FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid()::text OR recipient_id = auth.uid()::text);

-- ===========================================================================
-- Table: shared_task_tickets
--   Task tickets created by a user and optionally assigned to another user.
--   Creator and assignee can view; creator can insert/update/delete; assignee
--   may also update status (e.g. mark in progress / completed).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.shared_task_tickets (
  id            VARCHAR(36) PRIMARY KEY,
  title         VARCHAR(512) NOT NULL,
  description   VARCHAR(5000),
  assigned_to   VARCHAR(36),
  created_by    VARCHAR(36) NOT NULL,
  priority      public.task_priority NOT NULL DEFAULT 'MEDIUM',
  status        public.task_status NOT NULL DEFAULT 'OPEN',
  module_source VARCHAR(16),
  created_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMP WITHOUT TIME ZONE
);

ALTER TABLE public.shared_task_tickets ENABLE ROW LEVEL SECURITY;

-- SELECT: creator or assignee can view the ticket.
DROP POLICY IF EXISTS "shared_task_tickets_select" ON public.shared_task_tickets;
CREATE POLICY "shared_task_tickets_select"
  ON public.shared_task_tickets
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid()::text OR assigned_to = auth.uid()::text);

-- INSERT: only the creator can create a ticket they authored.
DROP POLICY IF EXISTS "shared_task_tickets_insert" ON public.shared_task_tickets;
CREATE POLICY "shared_task_tickets_insert"
  ON public.shared_task_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid()::text);

-- UPDATE: creator or assignee can update the ticket.
DROP POLICY IF EXISTS "shared_task_tickets_update" ON public.shared_task_tickets;
CREATE POLICY "shared_task_tickets_update"
  ON public.shared_task_tickets
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid()::text OR assigned_to = auth.uid()::text)
  WITH CHECK (created_by = auth.uid()::text OR assigned_to = auth.uid()::text);

-- DELETE: only the creator can delete the ticket.
DROP POLICY IF EXISTS "shared_task_tickets_delete" ON public.shared_task_tickets;
CREATE POLICY "shared_task_tickets_delete"
  ON public.shared_task_tickets
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- updated_at trigger for shared_task_tickets (mirrors SQLAlchemy onupdate)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_shared_task_tickets_updated_at ON public.shared_task_tickets;
DROP FUNCTION IF EXISTS public.set_shared_task_tickets_updated_at();

CREATE OR REPLACE FUNCTION public.set_shared_task_tickets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shared_task_tickets_updated_at
  BEFORE UPDATE ON public.shared_task_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_shared_task_tickets_updated_at();
