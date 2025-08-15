-- Fix project orchestrator timing and create correct Kanban column structure
-- First, let's fix the message_participants table by removing foreign key constraint to profiles
ALTER TABLE message_participants DROP CONSTRAINT IF EXISTS message_participants_user_id_fkey;

-- Create project_flows table for React Flow data
CREATE TABLE IF NOT EXISTS public.project_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  nodes jsonb DEFAULT '[]'::jsonb,
  edges jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on project_flows
ALTER TABLE public.project_flows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_flows
CREATE POLICY "Owners can manage project flows" ON public.project_flows
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_flows.project_id 
    AND p.owner_id = auth.uid()
  )
);

-- Add trigger for project_flows updated_at
CREATE TRIGGER update_project_flows_updated_at
  BEFORE UPDATE ON public.project_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update the create_project_message_thread function to only trigger on 'play' status
CREATE OR REPLACE FUNCTION public.create_project_message_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  thread_id UUID;
  team_member RECORD;
BEGIN
  -- Only create thread when project status changes to 'play'
  IF NEW.status = 'play' AND (OLD.status IS NULL OR OLD.status != 'play') THEN
    -- Create main project thread
    INSERT INTO public.message_threads (
      project_id,
      title,
      description,
      created_by
    ) VALUES (
      NEW.id,
      'Discussion générale - ' || NEW.title,
      'Thread principal de communication pour le projet ' || NEW.title,
      NEW.owner_id
    ) RETURNING id INTO thread_id;
    
    -- Add project owner as participant (use profiles or client_profiles)
    INSERT INTO public.message_participants (
      thread_id,
      user_id,
      email,
      name,
      role
    )
    SELECT 
      thread_id,
      p.id,
      p.email,
      COALESCE(p.first_name || ' ' || p.last_name, cp.first_name || ' ' || cp.last_name, p.email),
      'client'
    FROM public.profiles p
    LEFT JOIN public.client_profiles cp ON cp.user_id = p.id
    WHERE p.id = NEW.owner_id;
    
    -- Add all team members as participants
    FOR team_member IN 
      SELECT pt.member_id, pt.email, pt.first_name, pt.last_name
      FROM public.project_teams pt
      WHERE pt.project_id = NEW.id 
      AND pt.member_type = 'resource'
    LOOP
      INSERT INTO public.message_participants (
        thread_id,
        user_id,
        email,
        name,
        role
      ) VALUES (
        thread_id,
        team_member.member_id,
        team_member.email,
        COALESCE(team_member.first_name || ' ' || team_member.last_name, team_member.email),
        'candidate'
      ) ON CONFLICT (thread_id, email) DO NOTHING;
    END LOOP;
    
    -- Create welcome message
    INSERT INTO public.messages (
      thread_id,
      sender_id,
      sender_name,
      sender_email,
      content
    )
    SELECT 
      thread_id,
      p.id,
      COALESCE(p.first_name || ' ' || p.last_name, cp.first_name || ' ' || cp.last_name, p.email),
      p.email,
      'Bienvenue dans l''espace de discussion du projet "' || NEW.title || '". Nous pouvons maintenant communiquer efficacement pour mener à bien ce projet ! 🚀'
    FROM public.profiles p
    LEFT JOIN public.client_profiles cp ON cp.user_id = p.id
    WHERE p.id = NEW.owner_id;
  END IF;
  
  RETURN NEW;
END;
$function$;