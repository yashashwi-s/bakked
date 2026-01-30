-- Quick fix: Add missing column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS message_text TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_count INT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS delivered_count INT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS read_count INT DEFAULT 0;
