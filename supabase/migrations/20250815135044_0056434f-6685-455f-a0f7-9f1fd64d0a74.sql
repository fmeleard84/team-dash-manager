-- Fix security issues: Set search_path for functions
CREATE OR REPLACE FUNCTION public.create_project_message_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix security issues: Set search_path for update function
CREATE OR REPLACE FUNCTION public.update_thread_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.message_threads 
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$;