-- Add foreign key references to new tables
ALTER TABLE public.project_bookings 
ADD CONSTRAINT project_bookings_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_bookings 
ADD CONSTRAINT project_bookings_resource_assignment_id_fkey 
FOREIGN KEY (resource_assignment_id) REFERENCES public.hr_resource_assignments(id) ON DELETE CASCADE;

ALTER TABLE public.project_bookings 
ADD CONSTRAINT project_bookings_candidate_id_fkey 
FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.candidate_notifications 
ADD CONSTRAINT candidate_notifications_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.candidate_notifications 
ADD CONSTRAINT candidate_notifications_resource_assignment_id_fkey 
FOREIGN KEY (resource_assignment_id) REFERENCES public.hr_resource_assignments(id) ON DELETE CASCADE;

ALTER TABLE public.candidate_notifications 
ADD CONSTRAINT candidate_notifications_candidate_id_fkey 
FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id) ON DELETE CASCADE;