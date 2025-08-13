-- Create project_teams table to manage project members
CREATE TABLE public.project_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  member_id UUID NOT NULL,
  member_type TEXT NOT NULL CHECK (member_type IN ('client', 'resource')),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  profile_type TEXT,
  seniority TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, member_id)
);

-- Enable RLS on project_teams
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;

-- Create policies for project_teams
CREATE POLICY "Project owners can manage team members" 
ON public.project_teams 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = project_teams.project_id 
  AND p.owner_id = auth.uid()
));

CREATE POLICY "Team members can view their own team" 
ON public.project_teams 
FOR SELECT 
USING (member_id = auth.uid());

CREATE POLICY "Admins can manage all teams" 
ON public.project_teams 
FOR ALL 
USING (
  (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text) 
  OR 
  (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text)
);

-- Create function to sync project teams based on accepted bookings
CREATE OR REPLACE FUNCTION public.sync_project_teams()
RETURNS TRIGGER AS $$
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
    FROM candidate_profiles cp
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for project_bookings
CREATE TRIGGER trigger_sync_project_teams
  AFTER INSERT OR UPDATE ON public.project_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_project_teams();

-- Create function to add project owner to team when project is created
CREATE OR REPLACE FUNCTION public.add_project_owner_to_team()
RETURNS TRIGGER AS $$
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
  FROM profiles p
  WHERE p.id = NEW.owner_id
  ON CONFLICT (project_id, member_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for projects
CREATE TRIGGER trigger_add_project_owner_to_team
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.add_project_owner_to_team();

-- Create updated_at trigger for project_teams
CREATE TRIGGER update_project_teams_updated_at
  BEFORE UPDATE ON public.project_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();