-- ================================================
-- ADD JOB TITLE COLUMN TO MESSAGES TABLE
-- ================================================
-- Run this in Supabase SQL Editor to store job titles with messages
-- This allows showing job/position next to sender names
-- ================================================

-- Add sender_job_title column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS sender_job_title TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name = 'sender_job_title';