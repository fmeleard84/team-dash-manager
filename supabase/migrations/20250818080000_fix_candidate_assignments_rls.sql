-- Fix RLS policies for candidates to view their hr_resource_assignments
-- This migration ensures candidates can see their own assignments

-- Drop existing potentially problematic policies
DROP POLICY IF EXISTS "Candidates can view their own assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Users can view assignments for their profile" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Candidates view own assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "candidate_can_view_own_assignments" ON hr_resource_assignments;

-- Create a clear, permissive policy for candidates to view their assignments
CREATE POLICY "candidate_can_view_own_assignments" ON hr_resource_assignments
FOR SELECT
USING (
  profile_id IN (
    SELECT profile_id 
    FROM candidate_profiles 
    WHERE email = auth.email()
  )
);

-- Also ensure candidates can read their own profile
DROP POLICY IF EXISTS "Candidates can view own profile" ON candidate_profiles;
DROP POLICY IF EXISTS "candidate_can_view_own_profile" ON candidate_profiles;

CREATE POLICY "candidate_can_view_own_profile" ON candidate_profiles
FOR SELECT
USING (email = auth.email());

-- Ensure RLS is enabled on both tables
ALTER TABLE hr_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;