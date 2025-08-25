-- Fix the update_updated_at_column function to not update last_seen
-- This function is used by multiple tables, not all have last_seen column

-- Restore the original function that only updates updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a specific function for tables with last_seen
CREATE OR REPLACE FUNCTION public.update_presence_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_seen = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the user_presence trigger to use the new function
DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;

CREATE TRIGGER update_user_presence_updated_at 
BEFORE UPDATE ON user_presence
FOR EACH ROW 
EXECUTE FUNCTION update_presence_timestamps();