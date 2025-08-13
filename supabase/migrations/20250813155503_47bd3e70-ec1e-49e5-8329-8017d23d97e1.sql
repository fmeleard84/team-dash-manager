-- Fix function search paths to prevent security warnings

-- Update sync_project_teams function with secure search path
CREATE OR REPLACE FUNCTION public.sync_project_teams()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- If a booking is accepted, add the candidate to the project team
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    INSERT INTO public.project_teams (
      project_id,
      member_id,
      member_type,
      email,
      first_name,
      last_name,
      role,
      profile_type,
      seniority
    )
    SELECT 
      NEW.project_id,
      cp.id,
      'resource',
      cp.email,
      cp.first_name,
      cp.last_name,
      cp.profile_type::text,
      cp.profile_type::text,
      cp.seniority::text
    FROM public.candidate_profiles cp
    WHERE cp.id = NEW.candidate_id
    ON CONFLICT (project_id, member_id) DO UPDATE SET
      member_type = EXCLUDED.member_type,
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      profile_type = EXCLUDED.profile_type,
      seniority = EXCLUDED.seniority,
      updated_at = now();
  END IF;

  -- If a booking is rejected or cancelled, remove from team
  IF NEW.status IN ('rejected', 'cancelled') AND OLD.status = 'accepted' THEN
    DELETE FROM public.project_teams 
    WHERE project_id = NEW.project_id 
    AND member_id = NEW.candidate_id 
    AND member_type = 'resource';
  END IF;

  RETURN NEW;
END;
$$;

-- Update add_project_owner_to_team function with secure search path
CREATE OR REPLACE FUNCTION public.add_project_owner_to_team()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- Add the project owner to the team
  INSERT INTO public.project_teams (
    project_id,
    member_id,
    member_type,
    email,
    first_name,
    last_name,
    role
  )
  SELECT 
    NEW.id,
    NEW.owner_id,
    'client',
    p.email,
    p.first_name,
    p.last_name,
    'owner'
  FROM public.profiles p
  WHERE p.id = NEW.owner_id
  ON CONFLICT (project_id, member_id) DO NOTHING;

  RETURN NEW;
END;
$$;