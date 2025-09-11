-- ========================================
-- SCRIPT DE VÉRIFICATION DES INTÉGRATIONS
-- À exécuter dans SQL Editor de Supabase
-- ========================================

-- 1. VÉRIFIER QUE PGVECTOR EST INSTALLÉ
SELECT 
    extname as extension,
    extversion as version,
    CASE 
        WHEN extname = 'vector' THEN '✅ pgvector installé'
        ELSE '❌ pgvector non trouvé'
    END as status
FROM pg_extension 
WHERE extname = 'vector';

-- 2. VÉRIFIER LES TABLES CRÉÉES
SELECT 
    'Tables vectorielles' as categorie,
    COUNT(*) FILTER (WHERE table_name = 'documentation_embeddings') as embeddings_table,
    COUNT(*) FILTER (WHERE table_name = 'embedding_sync_queue') as sync_queue_table,
    COUNT(*) FILTER (WHERE table_name = 'faq_items') as faq_table,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ Toutes les tables créées'
        ELSE '❌ Tables manquantes'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('documentation_embeddings', 'embedding_sync_queue', 'faq_items');

-- 3. VÉRIFIER LES FAQs EXISTANTES
SELECT 
    'FAQs' as type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE embedding_synced_at IS NOT NULL) as synchronisees,
    COUNT(*) FILTER (WHERE embedding_synced_at IS NULL) as en_attente
FROM faq_items;

-- 4. VOIR LES FAQs DÉTAILLÉES
SELECT 
    id,
    LEFT(question, 50) as question,
    category,
    CASE 
        WHEN embedding_synced_at IS NOT NULL THEN '✅ Synchronisé'
        ELSE '⏳ En attente'
    END as statut_sync,
    embedding_synced_at,
    created_at
FROM faq_items
ORDER BY created_at DESC
LIMIT 10;

-- 5. VÉRIFIER LA QUEUE DE SYNCHRONISATION
SELECT 
    'Queue de sync' as type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as en_attente,
    COUNT(*) FILTER (WHERE status = 'processing') as en_cours,
    COUNT(*) FILTER (WHERE status = 'completed') as completes,
    COUNT(*) FILTER (WHERE status = 'failed') as echecs
FROM embedding_sync_queue;

-- 6. VOIR LES DERNIERS ITEMS DE LA QUEUE
SELECT 
    id,
    source_table,
    LEFT(source_id, 8) || '...' as source_id_short,
    action,
    status,
    error_message,
    created_at,
    processed_at
FROM embedding_sync_queue
ORDER BY created_at DESC
LIMIT 10;

-- 7. VÉRIFIER LES EMBEDDINGS GÉNÉRÉS
SELECT 
    'Embeddings' as type,
    COUNT(*) as total_embeddings,
    COUNT(DISTINCT source_id) as documents_uniques,
    COUNT(*) FILTER (WHERE content_type = 'faq') as embeddings_faq,
    COUNT(*) FILTER (WHERE embedding IS NOT NULL) as avec_vecteur,
    COUNT(*) FILTER (WHERE embedding IS NULL) as sans_vecteur
FROM documentation_embeddings;

-- 8. VOIR LES EMBEDDINGS DÉTAILLÉS
SELECT 
    id,
    content_type,
    LEFT(content, 100) as content_preview,
    source_table,
    LEFT(source_id, 8) || '...' as source_id_short,
    CASE 
        WHEN embedding IS NOT NULL THEN '✅ Vecteur OK (' || array_length(embedding::real[], 1) || ' dimensions)'
        ELSE '❌ Pas de vecteur'
    END as statut_vecteur,
    created_at
FROM documentation_embeddings
ORDER BY created_at DESC
LIMIT 10;

-- 9. VÉRIFIER LES TRIGGERS
SELECT 
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event_type,
    CASE 
        WHEN trigger_name = 'sync_faq_embeddings' THEN '✅ Trigger FAQ actif'
        ELSE trigger_name
    END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%sync%' OR trigger_name LIKE '%embedding%';

-- 10. TEST DE RECHERCHE VECTORIELLE (si des embeddings existent)
-- Cette requête ne fonctionnera que si vous avez au moins un embedding
WITH sample_embedding AS (
    SELECT embedding 
    FROM documentation_embeddings 
    WHERE embedding IS NOT NULL 
    LIMIT 1
)
SELECT 
    'Test recherche vectorielle' as test,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Recherche vectorielle fonctionne'
        ELSE '⚠️ Pas d\'embeddings pour tester'
    END as resultat,
    COUNT(*) as embeddings_trouves
FROM documentation_embeddings de, sample_embedding se
WHERE de.embedding IS NOT NULL
AND de.embedding <=> se.embedding < 1.0; -- Similarité cosinus

-- 11. RÉSUMÉ GLOBAL
SELECT 
    '📊 RÉSUMÉ SYSTÈME VECTORIEL' as titre,
    (SELECT COUNT(*) FROM faq_items) as total_faqs,
    (SELECT COUNT(*) FROM documentation_embeddings WHERE embedding IS NOT NULL) as total_embeddings,
    (SELECT COUNT(*) FROM embedding_sync_queue WHERE status = 'pending') as queue_en_attente,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
        AND EXISTS (SELECT 1 FROM documentation_embeddings WHERE embedding IS NOT NULL)
        THEN '✅ Système opérationnel'
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
        THEN '⚠️ pgvector OK mais pas d\'embeddings'
        ELSE '❌ pgvector non installé'
    END as statut_global;