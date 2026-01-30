-- ========================================
-- Migration: Add new columns to existing tables
-- Run this if tables already exist
-- ========================================

-- Add new columns to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS anniversary DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_visit TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_visits INT DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contacts_dob ON contacts(dob);
CREATE INDEX IF NOT EXISTS idx_contacts_anniversary ON contacts(anniversary);

-- ----------------------------------------
-- Message Templates Library
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,              -- birthday, anniversary, festival, nudge
    name TEXT,
    message_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------
-- Campaign Images Pool
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS campaign_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,              -- birthday, anniversary, festival, nudge
    image_url TEXT NOT NULL,
    filename TEXT,
    is_fixed BOOLEAN DEFAULT false,      -- Fixed images always included
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------
-- Recipient Groups (custom)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS recipient_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT,                           -- manual, birthday_today, anniversary_today
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES recipient_groups(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    excluded BOOLEAN DEFAULT false,
    custom_message TEXT,
    UNIQUE(group_id, contact_id)
);

-- RLS Policies
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipient_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access" ON message_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON campaign_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON recipient_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON group_members FOR ALL USING (true) WITH CHECK (true);
