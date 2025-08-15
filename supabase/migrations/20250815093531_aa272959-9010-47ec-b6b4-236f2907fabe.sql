-- Create notifications for existing event attendees
INSERT INTO public.candidate_event_notifications (
  candidate_id,
  event_id,
  project_id,
  title,
  description,
  event_date,
  location,
  video_url
)
SELECT 
  cp.id,
  pe.id,
  pe.project_id,
  'Nouvel événement: ' || pe.title,
  pe.description,
  pe.start_at,
  pe.location,
  pe.video_url
FROM public.candidate_profiles cp
JOIN public.project_event_attendees pea ON cp.email = pea.email
JOIN public.project_events pe ON pe.id = pea.event_id
WHERE pe.id = '3b1d1524-b24b-480c-a63e-2c265de4e6bc'
ON CONFLICT (candidate_id, event_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  event_date = EXCLUDED.event_date,
  location = EXCLUDED.location,
  video_url = EXCLUDED.video_url,
  updated_at = now();