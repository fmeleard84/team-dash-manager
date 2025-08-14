-- Manually trigger the notification creation for existing resource assignments
UPDATE public.hr_resource_assignments 
SET updated_at = now() 
WHERE booking_status = 'recherche';