-- ============================================================================
-- DIAGNOSTIC ET CORRECTION RLS
-- ============================================================================

-- 1. VÉRIFIER LES PROJETS EXISTANTS
-- ============================================================================
SELECT 
    p.id,
    p.title,
    p.owner_id,
    p.status,
    u.email as owner_email,
    p.created_at
FROM projects p
LEFT JOIN auth.users u ON u.id = p.owner_id
ORDER BY p.created_at DESC;

-- 2. VÉRIFIER LES BOOKINGS
-- ============================================================================
SELECT 
    pb.id,
    pb.project_id,
    pb.candidate_id,
    pb.status as booking_status,
    p.title as project_title,
    u.email as candidate_email
FROM project_bookings pb
LEFT JOIN projects p ON p.id = pb.project_id
LEFT JOIN auth.users u ON u.id = pb.candidate_id
ORDER BY pb.created_at DESC;

-- 3. VÉRIFIER LES UTILISATEURS
-- ============================================================================
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    created_at
FROM auth.users
WHERE email IN (
    'fmeleard+client_5@gmail.com',
    'fmeleard+ressource_5@gmail.com'
);

-- 4. DÉSACTIVER TEMPORAIREMENT RLS POUR DÉBOGUER
-- ============================================================================
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_resource_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_bookings DISABLE ROW LEVEL SECURITY;