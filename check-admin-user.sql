-- Script pour vérifier et créer un utilisateur admin
-- Connexion: postgresql://postgres.egdelmcijszuapcpglsy:R@ymonde7510_2a@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

-- 1. Vérifier les utilisateurs existants
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    p.role,
    p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email = 'fmeleard@gmail.com';

-- 2. Vérifier spécifiquement le profil
SELECT * FROM public.profiles WHERE email = 'fmeleard@gmail.com';

-- 3. Si besoin, mettre à jour le rôle vers admin
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE email = 'fmeleard@gmail.com';

-- 4. Afficher tous les admins
SELECT * FROM public.profiles WHERE role = 'admin';