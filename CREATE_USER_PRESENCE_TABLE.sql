-- ================================================
-- CREATE USER PRESENCE TABLE FOR REAL-TIME STATUS
-- ================================================
-- Run this in Supabase SQL Editor to enable real-time user presence
-- This will show who is online/offline in the messaging system
-- ================================================

-- Create table for tracking user presence/online status
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Policies for user_presence
CREATE POLICY "Users can view all presence status" ON user_presence
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own presence" ON user_presence
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presence" ON user_presence
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_online ON user_presence(is_online);

-- Enable realtime for presence
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_seen = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
CREATE TRIGGER update_user_presence_updated_at 
  BEFORE UPDATE ON user_presence 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old offline presence records (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM user_presence 
  WHERE is_online = false 
  AND last_seen < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Verify the table was created
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_presence'
ORDER BY ordinal_position;