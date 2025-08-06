-- Update candidate profile to mark email as verified for testing
UPDATE candidate_profiles 
SET is_email_verified = true 
WHERE email = 'fmeleard+a1201@gmail.com';