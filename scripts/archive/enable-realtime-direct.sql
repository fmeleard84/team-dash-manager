-- Enable Realtime for messaging tables
-- Run this in Supabase SQL Editor (not in Replication)

-- First, check current status
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Enable replica identity for better performance
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_threads REPLICA IDENTITY FULL;
ALTER TABLE public.message_attachments REPLICA IDENTITY FULL;
ALTER TABLE public.message_participants REPLICA IDENTITY FULL;
ALTER TABLE public.message_read_status REPLICA IDENTITY FULL;

-- Add tables to realtime publication
BEGIN;

-- Remove if exists (to avoid errors)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.messages;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.message_threads;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.message_attachments;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.message_participants;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.message_read_status;

-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_status;

COMMIT;

-- Verify the changes
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('messages', 'message_threads', 'message_attachments', 'message_participants', 'message_read_status');

-- Should return the 5 tables if successful