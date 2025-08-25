-- Add is_ai column to hr_profiles table
ALTER TABLE public.hr_profiles 
ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.hr_profiles.is_ai IS 'Indicates if this profile is an AI resource rather than a human resource';

-- Update any existing AI profiles if they exist (based on name patterns)
UPDATE public.hr_profiles 
SET is_ai = true 
WHERE LOWER(name) LIKE '%ai%' 
   OR LOWER(name) LIKE '%intelligence artificielle%'
   OR LOWER(name) LIKE '%gpt%'
   OR LOWER(name) LIKE '%claude%'
   OR LOWER(name) LIKE '%bot%';