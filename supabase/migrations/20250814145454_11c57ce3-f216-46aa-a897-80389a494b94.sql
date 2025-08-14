-- Update some candidate profiles to match available job roles for testing
UPDATE candidate_profiles 
SET profile_type = 'Expert-comptable'::profile_type 
WHERE email = 'fmeleard+1500@gmail.com';

UPDATE candidate_profiles 
SET profile_type = 'Comptable'::profile_type 
WHERE email = 'fmeleard+1610@gmail.com';

UPDATE candidate_profiles 
SET profile_type = 'Stratégiste marketing'::profile_type 
WHERE email = 'fmeleard+3@gmail.com';

-- Now trigger the notification creation again
UPDATE public.hr_resource_assignments 
SET updated_at = now() 
WHERE booking_status = 'recherche' AND id = '96d02dab-8578-4751-b563-a78edd2c209d';