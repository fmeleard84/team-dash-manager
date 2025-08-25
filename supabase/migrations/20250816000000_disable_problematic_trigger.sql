-- Disable the problematic trigger that's blocking assignments creation
-- Migration créée le: 2025-08-16

-- Drop the problematic trigger that prevents assignment creation/updates
DROP TRIGGER IF EXISTS trigger_create_notifications_on_assignment_change ON public.hr_resource_assignments;

-- Drop the old function that has schema mismatch issues
DROP FUNCTION IF EXISTS public.create_notifications_for_assignment();

-- Ensure we use the unified booking notification system only
-- The newer system uses booking_notifications table with proper schema

-- Log de la migration
INSERT INTO public.migration_logs (migration_name, applied_at, description) 
VALUES (
  '20250816000000_disable_problematic_trigger',
  NOW(),
  'Disabled problematic trigger create_notifications_for_assignment that was causing NULL constraint violations and blocking assignment creation/updates'
) ON CONFLICT (migration_name) DO NOTHING;