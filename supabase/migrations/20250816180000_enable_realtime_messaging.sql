-- Enable Realtime for messaging tables
-- This ensures that real-time subscriptions work properly

-- Enable realtime for message_threads
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for message_attachments
ALTER PUBLICATION supabase_realtime ADD TABLE message_attachments;

-- Enable realtime for message_participants
ALTER PUBLICATION supabase_realtime ADD TABLE message_participants;

-- Enable realtime for message_read_status
ALTER PUBLICATION supabase_realtime ADD TABLE message_read_status;

-- Create indexes for better realtime performance
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_threads_project_id ON message_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON message_threads(last_message_at);

-- Ensure RLS policies allow realtime
-- (Realtime respects RLS, so we need to make sure policies are correct)

-- Comment for verification
SELECT 'Realtime enabled for messaging tables' as status;