-- Vérifier le statut de l'assignment problématique
SELECT 
    a.id,
    a.booking_status,
    a.profile_id,
    a.seniority,
    a.current_candidate_id,
    a.modification_in_progress,
    p.title as project_title
FROM hr_resource_assignments a
JOIN projects p ON a.project_id = p.id
WHERE a.id = '61d7cab6-636c-4429-8df7-4b5858a4f0c4';

-- Voir toutes les ressources du projet
SELECT 
    a.id,
    a.booking_status,
    hp.name as profile_name,
    a.seniority
FROM hr_resource_assignments a
JOIN hr_profiles hp ON a.profile_id = hp.id
WHERE a.project_id = '129aa96f-ff6f-48ac-8978-90c212e89d2a'
ORDER BY a.created_at;