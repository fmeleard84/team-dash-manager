-- Temporarily make the policy very permissive to debug the issue
DROP POLICY IF EXISTS "Candidates can view their own bookings" ON project_bookings;

-- Create a permissive policy for debugging
CREATE POLICY "Candidates can view their own bookings" 
ON project_bookings 
FOR SELECT 
USING (true); -- Allow all access temporarily for debugging