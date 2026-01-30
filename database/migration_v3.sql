-- ========================================
-- Migration v3: Add media_urls to message_templates
-- Run this in Supabase SQL Editor
-- ========================================

-- Add media_urls column to message_templates
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Add button fields to message_templates
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS button_text TEXT;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS button_url TEXT;

-- Add is_active field to contacts for UI toggle (stored in frontend for now, but could be in DB)
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Done!
