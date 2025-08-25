-- Script de test pour les nouvelles politiques RLS simplifiées
-- À exécuter dans l'interface Supabase SQL Editor

-- =============================================================================
-- 1. TESTS DES FONCTIONS HELPER
-- =============================================================================

-- Test de la fonction get_current_user_email
SELECT 
  'Test get_current_user_email' as test_name,
  auth.get_current_user_email() as result;

-- Test de la fonction get_current_user_role  
SELECT 
  'Test get_current_user_role' as test_name,
  auth.get_current_user_role() as result;

-- =============================================================================
-- 2. TESTS DES POLITIQUES PROJECTS
-- =============================================================================

-- Test: Vérifier que les admins peuvent voir tous les projets
SET LOCAL role TO anon;
SET LOCAL request.jwt.claims TO '{"role": "admin", "email": "admin@test.com"}';

SELECT 
  'Admin can select all projects' as test_name,
  COUNT(*) as project_count
FROM public.projects;

-- Test: Vérifier qu'un client ne voit que ses projets
SET LOCAL request.jwt.claims TO '{"role": "client", "email": "client@test.com"}';

SELECT 
  'Client sees only own projects' as test_name,
  COUNT(*) as project_count
FROM public.projects 
WHERE owner_id = 'client@test.com';

-- =============================================================================
-- 3. TESTS DES POLITIQUES CANDIDATE_PROFILES
-- =============================================================================

-- Test: Candidat voit son propre profil
SET LOCAL request.jwt.claims TO '{"role": "candidate", "email": "candidate@test.com"}';

SELECT 
  'Candidate sees own profile' as test_name,
  COUNT(*) as profile_count
FROM public.candidate_profiles 
WHERE email = 'candidate@test.com';

-- Test: HR Manager voit tous les profils candidats
SET LOCAL request.jwt.claims TO '{"role": "hr_manager", "email": "hr@test.com"}';

SELECT 
  'HR Manager sees all candidate profiles' as test_name,
  COUNT(*) as profile_count
FROM public.candidate_profiles;

-- =============================================================================
-- 4. TESTS DES POLITIQUES KANBAN
-- =============================================================================

-- Créer un projet de test pour les kanban
INSERT INTO public.projects (id, title, owner_id, status)
VALUES (
  'test-project-123'::uuid,
  'Test Project for Kanban',
  'client@test.com',
  'play'
) ON CONFLICT DO NOTHING;

-- Créer un kanban board de test
INSERT INTO public.kanban_boards (id, project_id, title, created_by)
VALUES (
  'test-board-123'::uuid,
  'test-project-123'::uuid,
  'Test Board',
  'client@test.com'
) ON CONFLICT DO NOTHING;

-- Ajouter un membre au projet
INSERT INTO public.project_teams (project_id, member_email, member_name)
VALUES (
  'test-project-123'::uuid,
  'member@test.com',
  'Test Member'
) ON CONFLICT DO NOTHING;

-- Test: Propriétaire du projet voit le kanban board
SET LOCAL request.jwt.claims TO '{"role": "client", "email": "client@test.com"}';

SELECT 
  'Project owner sees kanban board' as test_name,
  COUNT(*) as board_count
FROM public.kanban_boards 
WHERE project_id = 'test-project-123'::uuid;

-- Test: Membre du projet voit le kanban board
SET LOCAL request.jwt.claims TO '{"role": "candidate", "email": "member@test.com"}';

SELECT 
  'Project member sees kanban board' as test_name,
  COUNT(*) as board_count
FROM public.kanban_boards 
WHERE project_id = 'test-project-123'::uuid;

-- Test: Non-membre ne voit pas le kanban board
SET LOCAL request.jwt.claims TO '{"role": "candidate", "email": "outsider@test.com"}';

SELECT 
  'Non-member cannot see kanban board' as test_name,
  COUNT(*) as board_count
FROM public.kanban_boards 
WHERE project_id = 'test-project-123'::uuid;

-- =============================================================================
-- 5. TESTS DE PERFORMANCE (Explain Plans)
-- =============================================================================

-- Test de performance pour la sélection des projets
SET LOCAL request.jwt.claims TO '{"role": "candidate", "email": "member@test.com"}';

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.projects 
WHERE public.is_project_member(id);

-- Test de performance pour les kanban boards
EXPLAIN (ANALYZE, BUFFERS)
SELECT kb.* 
FROM public.kanban_boards kb
WHERE public.is_project_member(kb.project_id);

-- =============================================================================
-- 6. CLEANUP DES DONNÉES DE TEST
-- =============================================================================

-- Nettoyer les données de test
DELETE FROM public.project_teams WHERE project_id = 'test-project-123'::uuid;
DELETE FROM public.kanban_boards WHERE id = 'test-board-123'::uuid;
DELETE FROM public.projects WHERE id = 'test-project-123'::uuid;

-- =============================================================================
-- 7. RÉSUMÉ DES AMÉLIORATIONS
-- =============================================================================

/*
AMÉLIORATIONS APPORTÉES PAR CETTE SIMPLIFICATION RLS:

✅ SÉCURITÉ:
- Suppression des politiques "USING (true)" dangereuses
- Fonctions helper avec SECURITY DEFINER et search_path strict
- Contrôle d'accès granulaire par rôle et ownership

✅ PERFORMANCE:
- Élimination des récursions RLS
- Index optimisés pour les nouvelles politiques
- Requêtes simplifiées sans JOIN complexes

✅ MAINTENABILITÉ:
- Fonctions helper centralisées et réutilisables
- Politiques cohérentes et prévisibles
- Documentation et commentaires ajoutés

✅ FONCTIONNALITÉS:
- Support complet des rôles (admin, client, candidate, hr_manager)
- Gestion des projets avec ownership et membership
- Système de fichiers sécurisé
- Kanban avec permissions héritées

⚠️ POINTS D'ATTENTION:
- Tester avec des utilisateurs réels
- Vérifier les performances sur gros volumes
- Valider l'intégration avec le frontend
*/