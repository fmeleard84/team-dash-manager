-- Drop and recreate the realtime publication to ensure it's working
-- First check what's currently in the publication
DO $$ 
BEGIN
    -- Remove tables from publication if they exist
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS messages;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS message_threads;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS message_attachments;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS message_participants;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS message_read_status;
    
    RAISE NOTICE 'Removed tables from publication';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing tables: %', SQLERRM;
END $$;

-- Add tables back to publication with explicit replica identity
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE message_threads REPLICA IDENTITY FULL;
ALTER TABLE message_attachments REPLICA IDENTITY FULL;
ALTER TABLE message_participants REPLICA IDENTITY FULL;
ALTER TABLE message_read_status REPLICA IDENTITY FULL;

-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE message_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE message_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE message_read_status;

-- Verify the tables are in the publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('messages', 'message_threads', 'message_attachments', 'message_participants', 'message_read_status');

-- Make sure RLS is enabled but allows realtime to work
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

-- Create or replace the RLS policies to be more permissive for realtime
-- Messages: Allow authenticated users to see messages in threads they're part of
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
CREATE POLICY "Users can view messages in their threads" ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM message_participants mp
            WHERE mp.thread_id = messages.thread_id
            AND mp.user_id = auth.uid()
            AND mp.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM message_participants mp
            JOIN profiles p ON p.email = mp.email
            WHERE mp.thread_id = messages.thread_id
            AND p.id = auth.uid()
            AND mp.is_active = true
        )
    );

-- Messages: Allow authenticated users to insert messages in their threads
DROP POLICY IF EXISTS "Users can send messages in their threads" ON messages;
CREATE POLICY "Users can send messages in their threads" ON messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM message_participants mp
            WHERE mp.thread_id = thread_id
            AND mp.user_id = auth.uid()
            AND mp.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM message_participants mp
            JOIN profiles p ON p.email = mp.email
            WHERE mp.thread_id = thread_id
            AND p.id = auth.uid()
            AND mp.is_active = true
        )
    );

-- Message threads: Allow viewing threads for participants
DROP POLICY IF EXISTS "Users can view their threads" ON message_threads;
CREATE POLICY "Users can view their threads" ON message_threads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM message_participants mp
            WHERE mp.thread_id = message_threads.id
            AND mp.user_id = auth.uid()
            AND mp.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM message_participants mp
            JOIN profiles p ON p.email = mp.email
            WHERE mp.thread_id = message_threads.id
            AND p.id = auth.uid()
            AND mp.is_active = true
        )
    );

-- Refresh the publication
SELECT pg_reload_conf();