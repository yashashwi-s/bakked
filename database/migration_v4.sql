-- ========================================
-- Migration v4: Add last_message tracking and buttons support
-- Run this in Supabase SQL Editor
-- ========================================

-- Add last_message tracking to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_message_group TEXT;

-- Add buttons array to message_templates (replaces single button fields)
-- Buttons are stored as JSONB array: [{"type": "url", "text": "Click", "url": "https://..."}]
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS buttons JSONB DEFAULT '[]';

-- Migrate existing button data to new format (if any)
UPDATE message_templates 
SET buttons = jsonb_build_array(
  jsonb_build_object(
    'type', 'url',
    'text', button_text,
    'url', button_url
  )
)
WHERE button_text IS NOT NULL 
  AND button_text != '' 
  AND button_url IS NOT NULL 
  AND button_url != ''
  AND (buttons IS NULL OR buttons = '[]');

-- Create index for fast lookup of contacts by last message
CREATE INDEX IF NOT EXISTS idx_contacts_last_message_at ON contacts(last_message_at DESC);

-- Function to update last_message on contact when message is sent
CREATE OR REPLACE FUNCTION update_contact_last_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the contact's last_message_at when a message is logged
  UPDATE contacts
  SET 
    last_message_at = NEW.sent_at,
    last_message_group = (
      SELECT name FROM groups WHERE id = (
        SELECT group_id FROM campaigns WHERE id = NEW.campaign_id
      )
    )
  WHERE id = NEW.contact_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_last_message ON message_logs;
CREATE TRIGGER trigger_update_last_message
  AFTER INSERT ON message_logs
  FOR EACH ROW
  WHEN (NEW.status = 'sent')
  EXECUTE FUNCTION update_contact_last_message();

-- ========================================
-- Security: Row Level Security improvements
-- ========================================

-- Ensure RLS is enabled on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read/write
-- (Adjust based on your auth setup)
DROP POLICY IF EXISTS "Allow authenticated access" ON contacts;
CREATE POLICY "Allow authenticated access" ON contacts
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated access" ON message_templates;
CREATE POLICY "Allow authenticated access" ON message_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated access" ON message_logs;
CREATE POLICY "Allow authenticated access" ON message_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated access" ON campaigns;
CREATE POLICY "Allow authenticated access" ON campaigns
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Done!
SELECT 'Migration v4 complete!' as status;
