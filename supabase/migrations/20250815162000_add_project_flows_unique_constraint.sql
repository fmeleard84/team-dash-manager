-- Add unique constraint on project_id for project_flows table
-- This allows ON CONFLICT functionality for upserts

-- Add unique constraint on project_id
ALTER TABLE public.project_flows 
  ADD CONSTRAINT project_flows_project_id_unique UNIQUE (project_id);

COMMENT ON MIGRATION IS 'Add unique constraint on project_id for project_flows upsert functionality';