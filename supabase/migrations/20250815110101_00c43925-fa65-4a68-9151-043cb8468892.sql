-- Add RLS policies for candidates to access kanban boards, columns and cards for projects they are assigned to

-- Kanban Boards: Allow candidates assigned to projects to view and manage boards
CREATE POLICY "Team members can view kanban boards" 
ON public.kanban_boards 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.project_teams pt
    WHERE pt.project_id = kanban_boards.project_id
    AND pt.member_type = 'resource'
    AND EXISTS (
      SELECT 1 
      FROM public.candidate_profiles cp
      WHERE cp.id = pt.member_id
      AND (
        cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
        OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
      )
    )
  )
);

CREATE POLICY "Team members can manage kanban boards" 
ON public.kanban_boards 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.project_teams pt
    WHERE pt.project_id = kanban_boards.project_id
    AND pt.member_type = 'resource'
    AND EXISTS (
      SELECT 1 
      FROM public.candidate_profiles cp
      WHERE cp.id = pt.member_id
      AND (
        cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
        OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.project_teams pt
    WHERE pt.project_id = kanban_boards.project_id
    AND pt.member_type = 'resource'
    AND EXISTS (
      SELECT 1 
      FROM public.candidate_profiles cp
      WHERE cp.id = pt.member_id
      AND (
        cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
        OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
      )
    )
  )
);

-- Kanban Columns: Allow team members to manage columns
CREATE POLICY "Team members can manage kanban columns" 
ON public.kanban_columns 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.kanban_boards b
    JOIN public.project_teams pt ON pt.project_id = b.project_id
    WHERE b.id = kanban_columns.board_id
    AND pt.member_type = 'resource'
    AND EXISTS (
      SELECT 1 
      FROM public.candidate_profiles cp
      WHERE cp.id = pt.member_id
      AND (
        cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
        OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.kanban_boards b
    JOIN public.project_teams pt ON pt.project_id = b.project_id
    WHERE b.id = kanban_columns.board_id
    AND pt.member_type = 'resource'
    AND EXISTS (
      SELECT 1 
      FROM public.candidate_profiles cp
      WHERE cp.id = pt.member_id
      AND (
        cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
        OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
      )
    )
  )
);

-- Kanban Cards: Allow team members to manage cards
CREATE POLICY "Team members can manage kanban cards" 
ON public.kanban_cards 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.kanban_boards b
    JOIN public.project_teams pt ON pt.project_id = b.project_id
    WHERE b.id = kanban_cards.board_id
    AND pt.member_type = 'resource'
    AND EXISTS (
      SELECT 1 
      FROM public.candidate_profiles cp
      WHERE cp.id = pt.member_id
      AND (
        cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
        OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.kanban_boards b
    JOIN public.project_teams pt ON pt.project_id = b.project_id
    WHERE b.id = kanban_cards.board_id
    AND pt.member_type = 'resource'
    AND EXISTS (
      SELECT 1 
      FROM public.candidate_profiles cp
      WHERE cp.id = pt.member_id
      AND (
        cp.email = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
        OR cp.email = ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'email'::text)
      )
    )
  )
);