-- Create kanban_notifications table
CREATE TABLE public.kanban_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  project_id UUID NOT NULL,
  kanban_board_id UUID,
  card_id UUID,
  notification_type TEXT NOT NULL, -- 'new_project', 'card_created', 'card_updated', 'card_deleted', 'column_created', 'column_deleted'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'unread',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_kanban_notifications_candidate ON kanban_notifications(candidate_id);
CREATE INDEX idx_kanban_notifications_project ON kanban_notifications(project_id);
CREATE INDEX idx_kanban_notifications_status ON kanban_notifications(status);

-- Enable RLS
ALTER TABLE public.kanban_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Candidates can view their own kanban notifications" 
ON public.kanban_notifications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM candidate_profiles cp
  WHERE cp.id = kanban_notifications.candidate_id 
  AND (cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text) 
       OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text))
));

CREATE POLICY "Candidates can update their own kanban notifications" 
ON public.kanban_notifications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 
  FROM candidate_profiles cp
  WHERE cp.id = kanban_notifications.candidate_id 
  AND (cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text) 
       OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text))
));

CREATE POLICY "Admins can manage all kanban notifications" 
ON public.kanban_notifications 
FOR ALL 
USING ((((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text) 
       OR (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text));

-- Add updated_at trigger
CREATE TRIGGER update_kanban_notifications_updated_at
  BEFORE UPDATE ON public.kanban_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to create kanban notifications for team members
CREATE OR REPLACE FUNCTION public.create_kanban_notifications_for_team(
  p_project_id UUID,
  p_kanban_board_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_card_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  team_member_record RECORD;
BEGIN
  -- Find all team members for this project and create notifications
  FOR team_member_record IN 
    SELECT DISTINCT cp.id as candidate_id
    FROM public.project_teams pt
    JOIN public.candidate_profiles cp ON cp.email = pt.email
    WHERE pt.project_id = p_project_id
    AND pt.member_type = 'resource'
  LOOP
    INSERT INTO public.kanban_notifications (
      candidate_id,
      project_id,
      kanban_board_id,
      card_id,
      notification_type,
      title,
      description,
      metadata
    ) VALUES (
      team_member_record.candidate_id,
      p_project_id,
      p_kanban_board_id,
      p_card_id,
      p_notification_type,
      p_title,
      p_description,
      p_metadata
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;