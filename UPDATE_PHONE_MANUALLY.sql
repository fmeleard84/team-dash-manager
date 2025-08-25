-- ⚠️ IMPORTANT: Exécutez ce script dans le dashboard Supabase SQL Editor

-- ========================================
-- METTRE À JOUR LE TÉLÉPHONE MANUELLEMENT
-- ========================================

-- Pour fmeleard+ressource_11@gmail.com
DO $$
DECLARE
    v_user_id UUID;
    v_phone TEXT := '+33 6 12 34 56 78'; -- CHANGEZ ICI avec le bon numéro
BEGIN
    -- Récupérer l'ID de l'utilisateur
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'fmeleard+ressource_11@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Mettre à jour les metadata dans auth.users
        UPDATE auth.users
        SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('phone', v_phone)
        WHERE id = v_user_id;
        
        RAISE NOTICE '✅ Metadata mises à jour pour auth.users';
        
        -- Mettre à jour dans profiles
        UPDATE profiles
        SET phone = v_phone
        WHERE id = v_user_id;
        
        RAISE NOTICE '✅ Téléphone mis à jour dans profiles';
        
        -- Mettre à jour dans candidate_profiles
        UPDATE candidate_profiles
        SET phone = v_phone
        WHERE email = 'fmeleard+ressource_11@gmail.com';
        
        RAISE NOTICE '✅ Téléphone mis à jour dans candidate_profiles';
    ELSE
        RAISE NOTICE '❌ Utilisateur non trouvé';
    END IF;
END $$;

-- Faire pareil pour les autres utilisateurs récents
DO $$
DECLARE
    r RECORD;
    v_phone TEXT;
    v_counter INTEGER := 0;
BEGIN
    FOR r IN 
        SELECT id, email 
        FROM auth.users 
        WHERE email LIKE 'fmeleard+ressource_%'
        AND raw_user_meta_data->>'phone' IS NULL
        ORDER BY created_at DESC
        LIMIT 5
    LOOP
        v_counter := v_counter + 1;
        v_phone := '+33 6 ' || LPAD(v_counter::text, 2, '0') || ' 00 00 ' || LPAD((v_counter * 11)::text, 2, '0');
        
        -- Mettre à jour metadata
        UPDATE auth.users
        SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('phone', v_phone)
        WHERE id = r.id;
        
        -- Mettre à jour profiles
        UPDATE profiles
        SET phone = v_phone
        WHERE id = r.id;
        
        -- Mettre à jour candidate_profiles
        UPDATE candidate_profiles
        SET phone = v_phone
        WHERE email = r.email;
        
        RAISE NOTICE '✅ Téléphone % ajouté pour %', v_phone, r.email;
    END LOOP;
END $$;

-- ========================================
-- VÉRIFIER LE RÉSULTAT
-- ========================================

SELECT 
    au.email,
    au.raw_user_meta_data->>'phone' as "Phone dans Auth metadata",
    p.phone as "Phone dans Profiles",
    cp.phone as "Phone dans Candidates",
    au.created_at::date as "Date création"
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN candidate_profiles cp ON cp.email = au.email
WHERE au.email LIKE 'fmeleard+ressource_%'
ORDER BY au.created_at DESC
LIMIT 10;