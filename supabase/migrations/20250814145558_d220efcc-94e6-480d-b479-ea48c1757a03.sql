-- Update some candidates to senior level for testing
UPDATE candidate_profiles 
SET seniority = 'senior'::hr_seniority 
WHERE email IN ('fmeleard+1500@gmail.com', 'fmeleard+3@gmail.com');

-- Now trigger the notification creation
UPDATE public.hr_resource_assignments 
SET updated_at = now() 
WHERE booking_status = 'recherche';