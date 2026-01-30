-- ========================================
-- Bakked WhatsApp Marketing Platform
-- Supabase Database Schema v2
-- Run this in Supabase SQL Editor
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------
-- Contacts: Customer CRM
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    dob DATE,                              -- Birthday
    anniversary DATE,                       -- Anniversary date
    last_visit TIMESTAMPTZ,                -- Last visit/purchase
    total_visits INT DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_dob ON contacts(dob);
CREATE INDEX IF NOT EXISTS idx_contacts_anniversary ON contacts(anniversary);

-- ----------------------------------------
-- Groups: Recipient groups by campaign type
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                    -- "Birthday Wishes", "Inactive Nudge"
    type TEXT NOT NULL,                    -- birthday, anniversary, festival, nudge
    description TEXT,
    color TEXT DEFAULT '#10b981',          -- For UI display
    trigger_rule JSONB,                    -- {"days_before": 0} or {"inactive_days": 30}
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------
-- Group Templates: Message content per group
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS group_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,            -- "Hi [Name], Happy Birthday!"
    media_url TEXT,
    button_text TEXT,
    button_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------
-- Campaigns: Batch message tracking
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    group_id UUID REFERENCES groups(id),
    message_text TEXT,
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    read_count INT DEFAULT 0,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------
-- Message Logs: Individual message status
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    wa_id TEXT,
    status TEXT DEFAULT 'pending',         -- pending, sent, delivered, read, failed
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_logs_wa_id ON message_logs(wa_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_status ON message_logs(status);
CREATE INDEX IF NOT EXISTS idx_message_logs_campaign ON message_logs(campaign_id);

-- ----------------------------------------
-- Media: Uploaded files
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_url TEXT NOT NULL,
    filename TEXT,
    content_type TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------
-- Enable RLS
-- ----------------------------------------
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Full access" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON group_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON message_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON media FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- Done! Run this in Supabase SQL Editor
-- ========================================
