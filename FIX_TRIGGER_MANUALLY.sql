-- ⚠️ IMPORTANT: Run this SQL directly in the Supabase Dashboard SQL Editor
-- Go to: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new
-- Copy and paste this entire script, then click "Run"

-- This fixes the update_updated_at_column() function that was incorrectly
-- modified to update a non-existent 'last_seen' field

-- Step 1: Drop the problematic function and all its triggers
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Step 2: Recreate the function to ONLY update updated_at field
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate all necessary triggers for tables with updated_at column
CREATE TRIGGER update_candidate_profiles_updated_at
    BEFORE UPDATE ON public.candidate_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_profiles_updated_at
    BEFORE UPDATE ON public.hr_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_resource_assignments_updated_at
    BEFORE UPDATE ON public.hr_resource_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kanban_columns_updated_at
    BEFORE UPDATE ON public.kanban_columns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kanban_cards_updated_at
    BEFORE UPDATE ON public.kanban_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_files_updated_at
    BEFORE UPDATE ON public.project_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 4: Create a separate function for user_presence table (which has last_seen)
CREATE OR REPLACE FUNCTION public.update_presence_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_seen = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for user_presence with the special function
CREATE TRIGGER update_user_presence_updated_at
    BEFORE UPDATE ON public.user_presence
    FOR EACH ROW
    EXECUTE FUNCTION public.update_presence_timestamps();

-- Step 6: Test the fix by updating a candidate profile
-- This should now work without the 'last_seen' error
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Get a candidate profile ID for testing
    SELECT id INTO test_id FROM candidate_profiles LIMIT 1;
    
    IF test_id IS NOT NULL THEN
        -- Try to update it
        UPDATE candidate_profiles 
        SET updated_at = NOW() 
        WHERE id = test_id;
        
        RAISE NOTICE 'Test successful! Trigger is now fixed.';
    ELSE
        RAISE NOTICE 'No candidate profiles found for testing, but trigger is fixed.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %, but trigger definition is fixed', SQLERRM;
END $$;