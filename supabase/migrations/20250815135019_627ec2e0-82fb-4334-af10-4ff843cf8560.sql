-- Create message threads table for project conversations
CREATE TABLE public.message_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false
);

-- Create message participants table
CREATE TABLE public.message_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'client' or 'candidate'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(thread_id, email)
);

-- Create message attachments table
CREATE TABLE public.message_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message read status table
CREATE TABLE public.message_read_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_email)
);

-- Enable RLS on all tables
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_threads
CREATE POLICY "Project owners can manage message threads"
ON public.message_threads
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.id = message_threads.project_id 
  AND p.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p 
  WHERE p.id = message_threads.project_id 
  AND p.owner_id = auth.uid()
));

CREATE POLICY "Team members can view message threads"
ON public.message_threads
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.project_teams pt
  WHERE pt.project_id = message_threads.project_id
  AND pt.member_type = 'resource'
  AND EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.id = pt.member_id
    AND (cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
      OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text))
  )
));

-- RLS Policies for messages
CREATE POLICY "Project owners can manage messages"
ON public.messages
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.message_threads mt
  JOIN public.projects p ON p.id = mt.project_id
  WHERE mt.id = messages.thread_id
  AND p.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.message_threads mt
  JOIN public.projects p ON p.id = mt.project_id
  WHERE mt.id = messages.thread_id
  AND p.owner_id = auth.uid()
));

CREATE POLICY "Team members can manage messages"
ON public.messages
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.message_threads mt
  JOIN public.project_teams pt ON pt.project_id = mt.project_id
  WHERE mt.id = messages.thread_id
  AND pt.member_type = 'resource'
  AND EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.id = pt.member_id
    AND (cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
      OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text))
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.message_threads mt
  JOIN public.project_teams pt ON pt.project_id = mt.project_id
  WHERE mt.id = messages.thread_id
  AND pt.member_type = 'resource'
  AND EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.id = pt.member_id
    AND (cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
      OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text))
  )
));

-- RLS Policies for message_participants
CREATE POLICY "Users can view participants in their threads"
ON public.message_participants
FOR SELECT
USING (
  -- Project owners can see all participants
  EXISTS (
    SELECT 1 FROM public.message_threads mt
    JOIN public.projects p ON p.id = mt.project_id
    WHERE mt.id = message_participants.thread_id
    AND p.owner_id = auth.uid()
  )
  OR
  -- Team members can see participants in their project threads
  EXISTS (
    SELECT 1 FROM public.message_threads mt
    JOIN public.project_teams pt ON pt.project_id = mt.project_id
    WHERE mt.id = message_participants.thread_id
    AND pt.member_type = 'resource'
    AND EXISTS (
      SELECT 1 FROM public.candidate_profiles cp
      WHERE cp.id = pt.member_id
      AND (cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
        OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text))
    )
  )
);

-- RLS Policies for message_attachments
CREATE POLICY "Users can manage attachments in accessible threads"
ON public.message_attachments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.messages m
  JOIN public.message_threads mt ON mt.id = m.thread_id
  JOIN public.projects p ON p.id = mt.project_id
  WHERE m.id = message_attachments.message_id
  AND (
    p.owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_teams pt
      WHERE pt.project_id = mt.project_id
      AND pt.member_type = 'resource'
      AND EXISTS (
        SELECT 1 FROM public.candidate_profiles cp
        WHERE cp.id = pt.member_id
        AND (cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
          OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text))
      )
    )
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.messages m
  JOIN public.message_threads mt ON mt.id = m.thread_id
  JOIN public.projects p ON p.id = mt.project_id
  WHERE m.id = message_attachments.message_id
  AND (
    p.owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_teams pt
      WHERE pt.project_id = mt.project_id
      AND pt.member_type = 'resource'
      AND EXISTS (
        SELECT 1 FROM public.candidate_profiles cp
        WHERE cp.id = pt.member_id
        AND (cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
          OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text))
      )
    )
  )
));

-- RLS Policies for message_read_status
CREATE POLICY "Users can manage their own read status"
ON public.message_read_status
FOR ALL
USING (
  user_email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  OR user_email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
)
WITH CHECK (
  user_email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  OR user_email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
);

-- Indexes for performance
CREATE INDEX idx_message_threads_project_id ON public.message_threads(project_id);
CREATE INDEX idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_message_participants_thread_id ON public.message_participants(thread_id);
CREATE INDEX idx_message_participants_email ON public.message_participants(email);
CREATE INDEX idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX idx_message_read_status_message_id ON public.message_read_status(message_id);

-- Function to create message thread when project starts
CREATE OR REPLACE FUNCTION public.create_project_message_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    -- Add project owner as participant
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
      COALESCE(p.first_name || ' ' || p.last_name, p.email),
      'client'
    FROM public.profiles p
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
      COALESCE(p.first_name || ' ' || p.last_name, p.email),
      p.email,
      'Bienvenue dans l''espace de discussion du projet "' || NEW.title || '". Nous pouvons maintenant communiquer efficacement pour mener à bien ce projet ! 🚀'
    FROM public.profiles p
    WHERE p.id = NEW.owner_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for automatic thread creation
CREATE TRIGGER trigger_create_project_message_thread
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.create_project_message_thread();

-- Function to update thread last_message_at
CREATE OR REPLACE FUNCTION public.update_thread_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.message_threads 
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update thread timestamp
CREATE TRIGGER trigger_update_thread_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_last_message();