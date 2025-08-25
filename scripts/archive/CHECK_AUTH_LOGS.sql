-- ============================================================================
-- VÉRIFIER LES LOGS D'AUTHENTIFICATION
-- ============================================================================

-- 1. Voir les derniers utilisateurs créés
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data->>'role' as role,
    confirmed_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Vérifier les profiles correspondants
SELECT 
    p.id,
    p.email,
    p.role,
    p.created_at,
    u.email as auth_email
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 3. Vérifier les candidate_profiles
SELECT 
    cp.id,
    cp.profile_id,
    cp.email,
    cp.created_at,
    p.role
FROM candidate_profiles cp
LEFT JOIN profiles p ON p.id = cp.profile_id
ORDER BY cp.created_at DESC
LIMIT 10;

-- 4. Compter les utilisateurs par rôle
SELECT 
    COALESCE(raw_user_meta_data->>'role', 'no_role') as role,
    COUNT(*) as count
FROM auth.users
GROUP BY role
ORDER BY count DESC;

-- 5. Trouver les utilisateurs sans profile
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'role' as role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- 6. Vérifier s'il y a des erreurs dans les logs système (si accessible)
-- Note: Ceci pourrait ne pas être accessible selon votre configuration
-- SELECT * FROM auth.audit_log_entries 
-- WHERE payload::text LIKE '%error%' 
-- ORDER BY created_at DESC 
-- LIMIT 10;