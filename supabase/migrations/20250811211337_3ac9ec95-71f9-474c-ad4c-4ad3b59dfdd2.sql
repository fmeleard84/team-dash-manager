-- Fix critical security vulnerability in candidate_notifications table
-- Remove all existing policies and create secure ones

-- Drop all existing policies for candidate_notifications
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.candidate_notifications;
DROP POLICY IF EXISTS "Candidates can update their notifications via Keycloak header" ON public.candidate_notifications;
DROP POLICY IF EXISTS "Candidates can update their own notifications" ON public.candidate_notifications;
DROP POLICY IF EXISTS "Candidates can view their notifications via Keycloak header" ON public.candidate_notifications;
DROP POLICY IF EXISTS "Candidates can view their own notifications" ON public.candidate_notifications;

-- Create secure policy for verified admins to manage all notifications
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

-- Create secure policy for candidates to view only their own notifications
CREATE POLICY "Candidates can view only their own notifications" 
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

-- Create secure policy for candidates to update only their own notifications (mark as read, etc.)
CREATE POLICY "Candidates can update only their own notifications" 
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