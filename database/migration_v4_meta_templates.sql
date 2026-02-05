-- Migration: Add Meta template sync columns
-- Run this in your Supabase SQL Editor

-- Add columns to track Meta API template status
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS meta_template_id TEXT,
ADD COLUMN IF NOT EXISTS meta_name TEXT,
ADD COLUMN IF NOT EXISTS meta_status TEXT DEFAULT 'LOCAL',
ADD COLUMN IF NOT EXISTS quality_score TEXT;

-- Add index for faster sync lookups
CREATE INDEX IF NOT EXISTS idx_message_templates_meta_name 
ON message_templates(meta_name) WHERE meta_name IS NOT NULL;

-- Comment: meta_status values
-- 'LOCAL' = Not submitted to Meta (default)
-- 'PENDING' = Submitted, awaiting approval
-- 'APPROVED' = Ready to send
-- 'REJECTED' = Rejected by Meta
-- 'PAUSED' = Paused by Meta (quality issues)
-- 'DISABLED' = Disabled
