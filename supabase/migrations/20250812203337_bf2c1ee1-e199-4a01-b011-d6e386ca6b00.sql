
-- Ajoute le lien Google Drive sur les événements (idempotent)
ALTER TABLE public.project_events
ADD COLUMN IF NOT EXISTS drive_url text;
