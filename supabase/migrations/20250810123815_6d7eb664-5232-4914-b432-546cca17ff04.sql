
-- Add optional budget and due date to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_budget numeric NULL,
  ADD COLUMN IF NOT EXISTS due_date date NULL;

-- Optional notes:
-- - client_budget left with no default and nullable to keep creation simple
-- - due_date nullable to keep it optional
