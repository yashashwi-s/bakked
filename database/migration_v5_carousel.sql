-- Migration V5: Add card_body_text for carousel templates
-- Run this in Supabase SQL Editor

-- Add card_body_text column for carousel templates
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS card_body_text TEXT;

-- Add comment for documentation
COMMENT ON COLUMN message_templates.card_body_text IS 'Text shown on all carousel cards (for 2+ image templates)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'message_templates' 
AND column_name = 'card_body_text';
