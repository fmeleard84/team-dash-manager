-- Add booking_data column to hr_resource_assignments table
-- This column stores candidate email and other booking-related metadata

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hr_resource_assignments' 
        AND column_name = 'booking_data'
    ) THEN
        ALTER TABLE public.hr_resource_assignments 
        ADD COLUMN booking_data JSONB DEFAULT '{}'::jsonb;
        
        -- Add index for querying by candidate_email
        CREATE INDEX IF NOT EXISTS idx_hr_resource_assignments_booking_candidate 
        ON public.hr_resource_assignments 
        USING GIN ((booking_data->>'candidate_email'));
        
        RAISE NOTICE 'Added booking_data column to hr_resource_assignments';
    ELSE
        RAISE NOTICE 'booking_data column already exists';
    END IF;
END $$;