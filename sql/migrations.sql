-- ============================================================================
-- Starwaves · Idempotent migrations for pre-existing deployments
--
-- The project has no Alembic migrations; init_db (server/app/db/session.py)
-- backfills columns on databases created before these columns existed.
-- create_all only creates missing tables, so existing tables need ALTERs.
--
-- Run order: extensions.sql -> schema.sql -> migrations.sql -> indexes.sql
-- Every statement is idempotent; fresh databases may skip this file.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- calls.messages (Firestore-shaped call transcript documents)
-- ---------------------------------------------------------------------------

ALTER TABLE calls ADD COLUMN IF NOT EXISTS messages JSON NOT NULL DEFAULT '[]';

-- ---------------------------------------------------------------------------
-- whatsapp_messages backfills
-- ---------------------------------------------------------------------------

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS reactions JSON DEFAULT '[]';
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- whatsapp_chats backfills
-- ---------------------------------------------------------------------------

ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS participants JSON DEFAULT '[]';
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS last_message JSON;
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS eve_auto_reply BOOLEAN DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- eve_memories embedding column (pgvector 1536-dim, text-embedding-3-small)
-- ---------------------------------------------------------------------------

ALTER TABLE eve_memories ADD COLUMN IF NOT EXISTS embedding vector(1536);
