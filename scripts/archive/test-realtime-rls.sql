-- Check RLS policies for messages table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'messages';

-- Check if table is in realtime publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('messages', 'message_threads', 'message_attachments');

-- Check recent messages to see if they exist
SELECT id, thread_id, sender_name, content, created_at 
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;