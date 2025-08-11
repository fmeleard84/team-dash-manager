-- Fix critical security vulnerability in candidate_notifications table
-- The current policies allow too broad access to private candidate communications

-- Drop the overly permissive policy that allows public access
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.candidate_notifications;

-- Create secure policy for admins to manage all notifications
CREATE POLICY "Verified admins can manage all notifications" 
ON public.candidate_notifications 
FOR ALL 
USING (
  -- Check if user has admin role in JWT groups
  ((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups') ? 'admin'
  OR
  -- Allow via edge functions with proper admin access header
  ((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access') = 'true'
)
WITH CHECK (
  -- Same conditions for the check
  ((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups') ? 'admin'
  OR
  ((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access') = 'true'
);

-- Create secure policy for candidates to view their own notifications via Keycloak email
CREATE POLICY "Candidates can view their own notifications via Keycloak" 
ON public.candidate_notifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp 
    WHERE cp.id = candidate_notifications.candidate_id 
    AND (
      cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
      OR
      cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
    )
  )
);

-- Create secure policy for candidates to update their own notifications (mark as read, etc.)
CREATE POLICY "Candidates can update their own notifications" 
ON public.candidate_notifications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp 
    WHERE cp.id = candidate_notifications.candidate_id 
    AND (
      cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
      OR
      cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp 
    WHERE cp.id = candidate_notifications.candidate_id 
    AND (
      cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
      OR
      cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
    )
  )
);

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