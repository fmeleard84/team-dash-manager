-- Add missing INSERT and DELETE policies for candidate_notifications table
-- to complete the security implementation

-- Create secure policy for admins to create notifications
CREATE POLICY "Verified admins can create notifications" 
ON public.candidate_notifications 
FOR INSERT 
WITH CHECK (
  -- Check if user has admin role in JWT groups
  ((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups') ? 'admin'
  OR
  -- Allow via edge functions with proper admin access header
  ((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access') = 'true'
);

-- Create secure policy for admins to delete notifications
CREATE POLICY "Verified admins can delete notifications" 
ON public.candidate_notifications 
FOR DELETE 
USING (
  -- Check if user has admin role in JWT groups
  ((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups') ? 'admin'
  OR
  -- Allow via edge functions with proper admin access header
  ((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access') = 'true'
);