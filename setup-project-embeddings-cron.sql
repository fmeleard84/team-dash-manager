-- =====================================================
-- CONFIGURATION CRON POUR TRAITEMENT AUTOMATIQUE
-- DES EMBEDDINGS DE PROJET
-- =====================================================
-- À exécuter dans le SQL Editor de Supabase Dashboard
-- après avoir activé l'extension pg_cron

-- 1. Activer l'extension pg_cron si pas déjà fait
-- ===================================================
-- Note: Cette extension doit être activée depuis le Dashboard Supabase
-- (Database > Extensions > Rechercher "pg_cron" et activer)

-- 2. Créer la tâche CRON pour traiter les embeddings
-- ===================================================
-- Traite la queue toutes les 2 minutes
SELECT cron.schedule(
  'process-project-embeddings',
  '*/2 * * * *', -- Toutes les 2 minutes
  $$
    SELECT net.http_post(
      url := 'https://egdelmcijszuapcpglsy.supabase.co/functions/v1/process-project-embeddings',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'action', 'process',
        'batchSize', 20  -- Traiter jusqu'à 20 éléments par batch
      )
    );
  $$
);

-- 3. Créer la tâche CRON pour réessayer les échecs
-- =================================================
-- Réessaye les éléments échoués toutes les 15 minutes
SELECT cron.schedule(
  'retry-failed-embeddings',
  '*/15 * * * *', -- Toutes les 15 minutes
  $$
    SELECT net.http_post(
      url := 'https://egdelmcijszuapcpglsy.supabase.co/functions/v1/process-project-embeddings',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'action', 'retry-failed'
      )
    );
  $$
);

-- 4. Créer la tâche CRON pour nettoyer les anciens éléments
-- =========================================================
-- Nettoie les éléments traités de plus de 7 jours, une fois par jour
SELECT cron.schedule(
  'clean-old-embedding-queue',
  '0 3 * * *', -- Tous les jours à 3h du matin
  $$
    SELECT net.http_post(
      url := 'https://egdelmcijszuapcpglsy.supabase.co/functions/v1/process-project-embeddings',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'action', 'clean-old'
      )
    );
  $$
);

-- 5. Créer la tâche CRON pour nettoyer les vieux embeddings
-- ==========================================================
-- Supprime les embeddings de plus de 90 jours, une fois par semaine
SELECT cron.schedule(
  'clean-old-embeddings',
  '0 4 * * 0', -- Tous les dimanches à 4h du matin
  $$
    SELECT clean_old_embeddings(90);
  $$
);

-- =====================================================
-- COMMANDES UTILES POUR GÉRER LES TÂCHES CRON
-- =====================================================

-- Voir toutes les tâches planifiées:
-- SELECT * FROM cron.job;

-- Voir l'historique des exécutions:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 50;

-- Désactiver une tâche:
-- SELECT cron.unschedule('process-project-embeddings');

-- Réactiver/modifier une tâche:
-- (Réexécuter le SELECT cron.schedule avec les nouveaux paramètres)

-- =====================================================
-- MONITORING ET DEBUG
-- =====================================================

-- Vérifier le nombre d'éléments en attente dans la queue:
-- SELECT
--   status,
--   COUNT(*) as count,
--   MIN(created_at) as oldest,
--   MAX(created_at) as newest
-- FROM project_embedding_queue
-- GROUP BY status;

-- Vérifier le nombre d'embeddings par projet:
-- SELECT
--   p.title,
--   pe.content_type,
--   COUNT(*) as count
-- FROM project_embeddings pe
-- JOIN projects p ON p.id = pe.project_id
-- GROUP BY p.title, pe.content_type
-- ORDER BY p.title, pe.content_type;

-- Voir les derniers échecs:
-- SELECT
--   id,
--   project_id,
--   content_type,
--   retry_count,
--   error_message,
--   created_at
-- FROM project_embedding_queue
-- WHERE status = 'failed'
-- ORDER BY created_at DESC
-- LIMIT 20;

-- =====================================================
-- NOTE IMPORTANTE
-- =====================================================
-- Avant d'exécuter ce script, assurez-vous que:
-- 1. L'extension pg_cron est activée
-- 2. L'extension pg_net est activée
-- 3. La clé OPENAI_API_KEY est configurée dans les secrets Edge Functions
-- 4. L'Edge Function process-project-embeddings est déployée