-- Fix RLS policies for candidates to view their assignments
-- This script ensures candidates can see their own hr_resource_assignments

-- First, check current policies
\d+ hr_resource_assignments

-- Drop potentially problematic policies
DROP POLICY IF EXISTS "Candidates can view their own assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Users can view assignments for their profile" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Candidates view own assignments" ON hr_resource_assignments;

-- Create a clear, permissive policy for candidates
CREATE POLICY "candidate_can_view_own_assignments" ON hr_resource_assignments
FOR SELECT
USING (
  profile_id IN (
    SELECT profile_id 
    FROM candidate_profiles 
    WHERE email = auth.email()
  )
);

-- Also ensure candidates can read their profile
DROP POLICY IF EXISTS "Candidates can view own profile" ON candidate_profiles;
CREATE POLICY "candidate_can_view_own_profile" ON candidate_profiles
FOR SELECT
USING (email = auth.email());

-- Check if RLS is enabled on both tables
SELECT schemaname, tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('hr_resource_assignments', 'candidate_profiles');

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('hr_resource_assignments', 'candidate_profiles');