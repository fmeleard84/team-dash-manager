-- Vérifier la structure des tables importantes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hr_resource_assignments'
AND table_schema = 'public';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hr_profiles'
AND table_schema = 'public';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'message_participants'
AND table_schema = 'public';