-- ⚠️ DIAGNOSTIC ET CORRECTION DE L'ERREUR "Database error saving new user"

-- ========================================
-- 1. DIAGNOSTIC : IDENTIFIER LE PROBLÈME EXACT
-- ========================================

-- Vérifier les triggers sur auth.users
SELECT 
    'TRIGGERS SUR AUTH.USERS:' as info;
SELECT 
    tgname as "Nom du trigger",
    proname as "Fonction appelée",
    tgenabled as "Activé"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass
AND tgtype = 7; -- AFTER INSERT triggers

-- Vérifier les colonnes NOT NULL dans candidate_profiles
SELECT 
    '', '---', '' WHERE false;
SELECT 
    'COLONNES OBLIGATOIRES DANS CANDIDATE_PROFILES:' as info;
SELECT 
    column_name as "Colonne",
    data_type as "Type",
    column_default as "Valeur par défaut"
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'candidate_profiles'
AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- ========================================
-- 2. SOLUTION 1 : DÉSACTIVER TEMPORAIREMENT LE TRIGGER
-- ========================================

-- Désactiver le trigger problématique
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ TRIGGER DÉSACTIVÉ TEMPORAIREMENT';
    RAISE NOTICE 'Essayez maintenant de créer un compte.';
    RAISE NOTICE 'Si ça fonctionne, le problème vient du trigger.';
END $$;

-- ========================================
-- 3. SOLUTION 2 : CRÉER UNE FONCTION MINIMALE
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user_minimal()
RETURNS trigger AS $$
BEGIN
    -- Version ULTRA minimale qui ne peut pas échouer
    BEGIN
        -- Créer seulement le profil de base
        INSERT INTO public.profiles (id, email, role)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'role', 'client')
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignorer toutes les erreurs
            NULL;
    END;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. SOLUTION 3 : CORRIGER LES COLONNES OBLIGATOIRES
-- ========================================

-- Rendre nullable les colonnes problématiques temporairement
ALTER TABLE candidate_profiles ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE candidate_profiles ALTER COLUMN daily_rate DROP NOT NULL;
ALTER TABLE candidate_profiles ALTER COLUMN seniority DROP NOT NULL;

-- Ajouter des valeurs par défaut
ALTER TABLE candidate_profiles ALTER COLUMN password_hash SET DEFAULT '';
ALTER TABLE candidate_profiles ALTER COLUMN daily_rate SET DEFAULT 0;
ALTER TABLE candidate_profiles ALTER COLUMN seniority SET DEFAULT 'junior';

-- ========================================
-- 5. SOLUTION 4 : FONCTION ROBUSTE AVEC LOGGING
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user_debug()
RETURNS trigger AS $$
DECLARE
    v_error_msg TEXT;
BEGIN
    -- Log l'entrée
    RAISE NOTICE 'DEBUG: handle_new_user appelé pour %', new.email;
    RAISE NOTICE 'DEBUG: Metadata = %', new.raw_user_meta_data;
    
    -- Étape 1: Créer le profil principal
    BEGIN
        INSERT INTO public.profiles (
            id,
            email,
            first_name,
            last_name,
            phone,
            company_name,
            role
        )
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', ''),
            new.raw_user_meta_data->>'phone',
            new.raw_user_meta_data->>'company_name',
            COALESCE(new.raw_user_meta_data->>'role', 'client')
        )
        ON CONFLICT (id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            company_name = EXCLUDED.company_name;
            
        RAISE NOTICE 'DEBUG: Profile créé avec succès';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
            RAISE NOTICE 'ERROR: Échec création profile - %', v_error_msg;
            -- On continue quand même
    END;
    
    -- Étape 2: Si candidat, créer le profil candidat
    IF new.raw_user_meta_data->>'role' = 'candidate' THEN
        RAISE NOTICE 'DEBUG: Création du profil candidat...';
        
        BEGIN
            -- Essayer d'abord avec toutes les colonnes
            INSERT INTO public.candidate_profiles (
                email,
                password_hash,
                first_name,
                last_name,
                phone,
                qualification_status,
                daily_rate,
                seniority
            )
            VALUES (
                new.email,
                COALESCE('', ''),
                COALESCE(new.raw_user_meta_data->>'first_name', ''),
                COALESCE(new.raw_user_meta_data->>'last_name', ''),
                new.raw_user_meta_data->>'phone',
                'pending',
                0,
                'junior'
            )
            ON CONFLICT (email) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                phone = EXCLUDED.phone;
                
            RAISE NOTICE 'DEBUG: Profil candidat créé avec succès';
        EXCEPTION
            WHEN OTHERS THEN
                GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
                RAISE NOTICE 'ERROR: Échec création profil candidat - %', v_error_msg;
                
                -- Essayer une version minimale
                BEGIN
                    INSERT INTO public.candidate_profiles (email)
                    VALUES (new.email)
                    ON CONFLICT (email) DO NOTHING;
                    RAISE NOTICE 'DEBUG: Profil candidat minimal créé';
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE NOTICE 'ERROR: Impossible de créer même un profil minimal';
                END;
        END;
    END IF;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'FATAL ERROR: %', v_error_msg;
        -- IMPORTANT: On retourne quand même new pour ne pas bloquer l'inscription
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. APPLIQUER LA SOLUTION
-- ========================================

-- Option A : Utiliser la fonction de debug (recommandé pour diagnostiquer)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_debug();

-- Option B : Utiliser la fonction minimale (si vous voulez juste que ça marche)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_minimal();

-- Option C : Désactiver complètement le trigger (pour tester)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ========================================
-- 7. VÉRIFICATION
-- ========================================

SELECT 
    '', '---', '' WHERE false;
SELECT 
    'ÉTAT FINAL DES TRIGGERS:' as info;
SELECT 
    tgname as "Trigger",
    CASE tgenabled 
        WHEN 'O' THEN '✅ Actif'
        WHEN 'D' THEN '❌ Désactivé'
        ELSE '⚠️ État inconnu'
    END as "État",
    proname as "Fonction"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass
AND tgtype = 7;

-- ========================================
-- 8. INSTRUCTIONS
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 INSTRUCTIONS:';
    RAISE NOTICE '';
    RAISE NOTICE '1. La fonction de debug est maintenant active';
    RAISE NOTICE '2. Essayez de créer un nouveau compte';
    RAISE NOTICE '3. Regardez les LOGS dans Supabase Dashboard';
    RAISE NOTICE '4. Les messages DEBUG vous diront exactement où ça échoue';
    RAISE NOTICE '';
    RAISE NOTICE 'SI ÇA NE MARCHE TOUJOURS PAS:';
    RAISE NOTICE '- Décommentez Option B (ligne 184-186) pour la version minimale';
    RAISE NOTICE '- OU décommentez Option C (ligne 189) pour désactiver le trigger';
    RAISE NOTICE '';
    RAISE NOTICE 'POUR VOIR LES LOGS:';
    RAISE NOTICE 'Supabase Dashboard > Logs > Postgres Logs';
    RAISE NOTICE 'Filtrez par: handle_new_user';
END $$;