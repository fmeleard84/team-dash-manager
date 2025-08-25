-- ⚠️ IMPORTANT: Exécutez ce script dans le dashboard Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new

-- ========================================
-- CRÉER DES RÉSULTATS DE TEST POUR VÉRIFIER
-- ========================================

DO $$
DECLARE
    v_candidate_id UUID;
    v_email TEXT;
    v_created_count INTEGER := 0;
BEGIN
    -- Pour chaque candidat récent sans résultat de test
    FOR v_candidate_id, v_email IN 
        SELECT cp.id, cp.email
        FROM candidate_profiles cp
        LEFT JOIN candidate_qualification_results cqr ON cp.id = cqr.candidate_id
        WHERE cqr.id IS NULL
        AND cp.email LIKE 'fmeleard+ressource_%'
        ORDER BY cp.created_at DESC
        LIMIT 3
    LOOP
        -- Créer un résultat de test
        INSERT INTO candidate_qualification_results (
            candidate_id,
            test_answers,
            score,
            qualification_status
        ) VALUES (
            v_candidate_id,
            jsonb_build_object(
                'q1', 'Réponse 1',
                'q2', 'Réponse 2', 
                'q3', 'Réponse 3',
                'q4', 'Réponse 4',
                'q5', 'Réponse 5'
            ),
            CASE 
                WHEN v_email LIKE '%_9@%' THEN 95
                WHEN v_email LIKE '%_7@%' THEN 85
                ELSE 75
            END,
            'qualified'
        );
        
        v_created_count := v_created_count + 1;
        RAISE NOTICE '✅ Résultat créé pour: %', v_email;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Total de résultats créés: %', v_created_count;
END $$;

-- ========================================
-- METTRE À JOUR LE TÉLÉPHONE POUR LES TESTS
-- ========================================

-- Mettre à jour le téléphone pour quelques candidats récents
UPDATE candidate_profiles 
SET phone = '+33 6 12 34 56 78'
WHERE email = 'fmeleard+ressource_9@gmail.com';

UPDATE candidate_profiles 
SET phone = '+33 6 98 76 54 32'
WHERE email = 'fmeleard+ressource_7@gmail.com';

-- Aussi mettre à jour dans la table profiles
UPDATE profiles
SET phone = '+33 6 12 34 56 78'
WHERE email = 'fmeleard+ressource_9@gmail.com';

UPDATE profiles
SET phone = '+33 6 98 76 54 32'
WHERE email = 'fmeleard+ressource_7@gmail.com';

-- ========================================
-- VÉRIFIER LES RÉSULTATS
-- ========================================

RAISE NOTICE '';
RAISE NOTICE '=== VÉRIFICATION APRÈS CRÉATION ===';

-- Afficher les candidats avec leurs résultats
SELECT 
    cp.email,
    cp.phone,
    cp.qualification_status as "Statut profil",
    cqr.score as "Score test",
    cqr.qualification_status as "Statut test",
    CASE 
        WHEN cqr.id IS NOT NULL THEN '✅ OUI'
        ELSE '❌ NON'
    END as "Test passé?",
    jsonb_array_length(COALESCE(cqr.test_answers::jsonb, '{}'::jsonb)) as "Nb réponses",
    cp.created_at::date as "Date création"
FROM candidate_profiles cp
LEFT JOIN candidate_qualification_results cqr ON cp.id = cqr.candidate_id
WHERE cp.email LIKE 'fmeleard+ressource_%'
ORDER BY cp.created_at DESC
LIMIT 10;

-- ========================================
-- DEBUG : POURQUOI LES SAUVEGARDES ÉCHOUENT
-- ========================================

RAISE NOTICE '';
RAISE NOTICE '=== ANALYSE DES PROBLÈMES ===';

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Vérifier les contraintes uniques
    SELECT COUNT(*) INTO v_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'candidate_qualification_results' 
    AND constraint_type = 'UNIQUE';
    RAISE NOTICE '🔍 Contraintes UNIQUE sur candidate_qualification_results: %', v_count;
    
    -- Vérifier s'il y a un index unique sur candidate_id
    SELECT COUNT(*) INTO v_count
    FROM pg_indexes 
    WHERE tablename = 'candidate_qualification_results' 
    AND indexdef LIKE '%UNIQUE%candidate_id%';
    RAISE NOTICE '🔍 Index UNIQUE sur candidate_id: %', v_count;
    
    -- Afficher les politiques RLS
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Politiques RLS actuelles:';
    FOR v_count IN 
        SELECT policyname, cmd, qual 
        FROM pg_policies 
        WHERE tablename = 'candidate_qualification_results'
    LOOP
        -- Juste pour la structure
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '💡 CONSEIL: Si les résultats ne se sauvegardent pas:';
    RAISE NOTICE '   1. Vérifiez la console du navigateur pour les erreurs';
    RAISE NOTICE '   2. Le candidateId doit correspondre à un ID valide dans candidate_profiles';
    RAISE NOTICE '   3. Les politiques RLS doivent permettre INSERT pour le candidat connecté';
END $$;