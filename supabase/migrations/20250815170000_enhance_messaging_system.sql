-- Améliorations du système de messagerie pour fonctionnalités Slack-like
-- Migration créée le: 2025-08-15

-- =============================================================================
-- 1. AMÉLIORER LA TABLE MESSAGES
-- =============================================================================

-- Ajouter des colonnes pour les fonctionnalités avancées
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}';

-- Index pour les réponses et mentions
CREATE INDEX IF NOT EXISTS idx_messages_parent ON public.messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_mentions ON public.messages USING GIN(mentions);
CREATE INDEX IF NOT EXISTS idx_messages_system ON public.messages(is_system_message);

-- =============================================================================
-- 2. CRÉER LA TABLE MESSAGE_REACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    user_email TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_email, emoji)
);

-- Index pour les réactions
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON public.message_reactions(user_email);

-- RLS pour les réactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_reactions_select_policy" ON public.message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.message_threads mt ON m.thread_id = mt.id
      WHERE m.id = message_id
      AND public.is_project_member(mt.project_id)
    )
  );

CREATE POLICY "message_reactions_insert_policy" ON public.message_reactions
  FOR INSERT
  WITH CHECK (
    user_email = auth.get_current_user_email()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.message_threads mt ON m.thread_id = mt.id
      WHERE m.id = message_id
      AND public.is_project_member(mt.project_id)
    )
  );

CREATE POLICY "message_reactions_delete_policy" ON public.message_reactions
  FOR DELETE
  USING (user_email = auth.get_current_user_email());

-- =============================================================================
-- 3. AMÉLIORER LA TABLE MESSAGE_ATTACHMENTS
-- =============================================================================

-- Ajouter des colonnes pour les métadonnées des fichiers
ALTER TABLE public.message_attachments 
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS is_image BOOLEAN GENERATED ALWAYS AS (file_type LIKE 'image/%') STORED;

-- Index pour les images et téléchargements
CREATE INDEX IF NOT EXISTS idx_message_attachments_images ON public.message_attachments(is_image);
CREATE INDEX IF NOT EXISTS idx_message_attachments_downloads ON public.message_attachments(download_count);

-- =============================================================================
-- 4. CRÉER LA TABLE TYPING_INDICATORS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.typing_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 seconds'),
    UNIQUE(thread_id, user_email)
);

-- Index pour les indicateurs de saisie
CREATE INDEX IF NOT EXISTS idx_typing_indicators_thread ON public.typing_indicators(thread_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_expires ON public.typing_indicators(expires_at);

-- RLS pour les indicateurs de saisie
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "typing_indicators_policy" ON public.typing_indicators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_id
      AND public.is_project_member(mt.project_id)
    )
  );

-- Fonction pour nettoyer les indicateurs expirés
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.typing_indicators 
  WHERE expires_at < NOW();
END;
$$;

-- =============================================================================
-- 5. CRÉER LA TABLE USER_PRESENCE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_presence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL UNIQUE,
    user_name TEXT NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('online', 'away', 'busy', 'offline')) DEFAULT 'online',
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour la présence utilisateur
CREATE INDEX IF NOT EXISTS idx_user_presence_email ON public.user_presence(user_email);
CREATE INDEX IF NOT EXISTS idx_user_presence_project ON public.user_presence(project_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON public.user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON public.user_presence(last_seen_at);

-- RLS pour la présence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_presence_select_policy" ON public.user_presence
  FOR SELECT
  USING (
    project_id IS NULL 
    OR public.is_project_member(project_id)
  );

CREATE POLICY "user_presence_upsert_policy" ON public.user_presence
  FOR ALL
  USING (user_email = auth.get_current_user_email())
  WITH CHECK (user_email = auth.get_current_user_email());

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_user_presence_updated_at 
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 6. AMÉLIORER MESSAGE_PARTICIPANTS
-- =============================================================================

-- Ajouter des colonnes pour le statut en ligne
ALTER TABLE public.message_participants 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "sound": true,
  "desktop": true,
  "email": false,
  "mobile": true
}'::jsonb;

-- Index pour le statut en ligne
CREATE INDEX IF NOT EXISTS idx_message_participants_online ON public.message_participants(is_online);
CREATE INDEX IF NOT EXISTS idx_message_participants_last_seen ON public.message_participants(last_seen_at);

-- =============================================================================
-- 7. FONCTIONS POUR LA MESSAGERIE AVANCÉE
-- =============================================================================

-- Fonction pour obtenir les statistiques d'un thread
CREATE OR REPLACE FUNCTION get_thread_stats(thread_id_param UUID)
RETURNS TABLE (
  total_messages INTEGER,
  total_participants INTEGER,
  online_participants INTEGER,
  unread_messages INTEGER,
  last_activity TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM public.messages WHERE thread_id = thread_id_param),
    (SELECT COUNT(*)::INTEGER FROM public.message_participants WHERE thread_id = thread_id_param AND is_active = true),
    (SELECT COUNT(*)::INTEGER FROM public.message_participants WHERE thread_id = thread_id_param AND is_online = true),
    (SELECT COUNT(*)::INTEGER FROM public.messages m 
     WHERE m.thread_id = thread_id_param 
     AND m.sender_email != auth.get_current_user_email()
     AND NOT EXISTS (
       SELECT 1 FROM public.message_read_status mrs 
       WHERE mrs.message_id = m.id 
       AND mrs.user_email = auth.get_current_user_email()
     )
    ),
    (SELECT MAX(created_at) FROM public.messages WHERE thread_id = thread_id_param);
END;
$$;

-- Fonction pour marquer tous les messages d'un thread comme lus
CREATE OR REPLACE FUNCTION mark_thread_as_read(thread_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  current_user_email TEXT;
BEGIN
  current_user_email := auth.get_current_user_email();
  
  IF current_user_email IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Insérer les statuts de lecture pour tous les messages non lus
  INSERT INTO public.message_read_status (message_id, user_email)
  SELECT m.id, current_user_email
  FROM public.messages m
  WHERE m.thread_id = thread_id_param
    AND m.sender_email != current_user_email
    AND NOT EXISTS (
      SELECT 1 FROM public.message_read_status mrs
      WHERE mrs.message_id = m.id AND mrs.user_email = current_user_email
    )
  ON CONFLICT (message_id, user_email) DO NOTHING;

  -- Mettre à jour last_read_at du participant
  UPDATE public.message_participants 
  SET last_read_at = NOW()
  WHERE thread_id = thread_id_param AND email = current_user_email;
END;
$$;

-- Fonction pour obtenir les messages avec réactions et réponses
CREATE OR REPLACE FUNCTION get_messages_with_metadata(thread_id_param UUID, limit_param INTEGER DEFAULT 50, offset_param INTEGER DEFAULT 0)
RETURNS TABLE (
  message_id UUID,
  thread_id UUID,
  sender_id TEXT,
  sender_name TEXT,
  sender_email TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  parent_message_id UUID,
  is_edited BOOLEAN,
  edit_count INTEGER,
  is_system_message BOOLEAN,
  mentions TEXT[],
  reactions JSONB,
  attachments JSONB,
  reply_count INTEGER,
  read_by_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.thread_id,
    m.sender_id,
    m.sender_name,
    m.sender_email,
    m.content,
    m.created_at,
    m.updated_at,
    m.parent_message_id,
    m.is_edited,
    m.edit_count,
    m.is_system_message,
    m.mentions,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'emoji', r.emoji,
          'count', r.reaction_count,
          'users', r.users
        )
      )
      FROM (
        SELECT 
          mr.emoji,
          COUNT(*) as reaction_count,
          jsonb_agg(mr.user_email) as users
        FROM public.message_reactions mr
        WHERE mr.message_id = m.id
        GROUP BY mr.emoji
      ) r), 
      '[]'::jsonb
    ) as reactions,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'file_name', a.file_name,
          'file_type', a.file_type,
          'file_size', a.file_size,
          'is_image', a.is_image,
          'download_count', a.download_count
        )
      )
      FROM public.message_attachments a
      WHERE a.message_id = m.id),
      '[]'::jsonb
    ) as attachments,
    (SELECT COUNT(*)::INTEGER FROM public.messages replies WHERE replies.parent_message_id = m.id) as reply_count,
    (SELECT COUNT(*)::INTEGER FROM public.message_read_status mrs WHERE mrs.message_id = m.id) as read_by_count
  FROM public.messages m
  WHERE m.thread_id = thread_id_param
  ORDER BY m.created_at ASC
  LIMIT limit_param OFFSET offset_param;
END;
$$;

-- =============================================================================
-- 8. TRIGGERS ET AUTOMATISATIONS
-- =============================================================================

-- Trigger pour nettoyer les indicateurs de saisie expirés
CREATE OR REPLACE FUNCTION cleanup_typing_indicators_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Nettoyer les anciens indicateurs à chaque insertion
  PERFORM cleanup_expired_typing_indicators();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_typing_on_insert
  BEFORE INSERT ON public.typing_indicators
  FOR EACH ROW EXECUTE FUNCTION cleanup_typing_indicators_trigger();

-- Trigger pour mettre à jour automatiquement last_message_at sur les threads
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.message_threads 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.message_threads 
    SET last_message_at = COALESCE(
      (SELECT MAX(created_at) FROM public.messages WHERE thread_id = OLD.thread_id),
      (SELECT created_at FROM public.message_threads WHERE id = OLD.thread_id)
    ),
    updated_at = NOW()
    WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_thread_last_message_trigger ON public.messages;
CREATE TRIGGER update_thread_last_message_trigger
  AFTER INSERT OR DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_last_message();

-- =============================================================================
-- 9. VUES PRATIQUES
-- =============================================================================

-- Vue pour les threads avec statistiques
CREATE OR REPLACE VIEW public.message_threads_with_stats AS
SELECT 
  mt.*,
  COALESCE(stats.total_messages, 0) as total_messages,
  COALESCE(stats.total_participants, 0) as total_participants,
  COALESCE(stats.online_participants, 0) as online_participants
FROM public.message_threads mt
LEFT JOIN LATERAL (
  SELECT 
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT mp.id) as total_participants,
    COUNT(DISTINCT CASE WHEN mp.is_online THEN mp.id END) as online_participants
  FROM public.messages m
  FULL OUTER JOIN public.message_participants mp ON mp.thread_id = mt.id
  WHERE m.thread_id = mt.id OR mp.thread_id = mt.id
) stats ON true;

-- =============================================================================
-- 10. TÂCHES DE MAINTENANCE PROGRAMMÉES (À configurer via cron ou pg_cron)
-- =============================================================================

-- Fonction de maintenance générale
CREATE OR REPLACE FUNCTION maintenance_messaging_system()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Nettoyer les indicateurs de saisie expirés
  PERFORM cleanup_expired_typing_indicators();
  
  -- Mettre à jour le statut offline des utilisateurs inactifs depuis plus de 5 minutes
  UPDATE public.user_presence 
  SET status = 'offline', updated_at = NOW()
  WHERE last_seen_at < NOW() - INTERVAL '5 minutes' 
    AND status != 'offline';
    
  -- Nettoyer les anciennes données de présence (plus de 7 jours)
  DELETE FROM public.user_presence 
  WHERE last_seen_at < NOW() - INTERVAL '7 days' 
    AND status = 'offline';

  -- Nettoyer les notifications de messages anciennes (plus de 30 jours)
  DELETE FROM public.candidate_notifications 
  WHERE type = 'message_received' 
    AND created_at < NOW() - INTERVAL '30 days';
    
  -- Log de maintenance
  INSERT INTO public.migration_logs (migration_name, applied_at, description) 
  VALUES (
    'maintenance_messaging_system_' || to_char(NOW(), 'YYYY-MM-DD_HH24-MI-SS'),
    NOW(),
    'Maintenance automatique du système de messagerie'
  );
END;
$$;

-- =============================================================================
-- 11. DONNÉES DE TEST POUR LE DÉVELOPPEMENT
-- =============================================================================

-- Insérer quelques réactions de test (seulement si des messages existent)
DO $$
DECLARE
  sample_message_id UUID;
BEGIN
  SELECT id INTO sample_message_id 
  FROM public.messages 
  LIMIT 1;
  
  IF sample_message_id IS NOT NULL THEN
    INSERT INTO public.message_reactions (message_id, user_email, emoji)
    VALUES 
      (sample_message_id, 'test@example.com', '👍'),
      (sample_message_id, 'test2@example.com', '❤️')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =============================================================================
-- 12. LOG DE LA MIGRATION
-- =============================================================================

INSERT INTO public.migration_logs (migration_name, applied_at, description) 
VALUES (
  '20250815170000_enhance_messaging_system',
  NOW(),
  'Enhanced messaging system with Slack-like features: reactions, threads, typing indicators, presence, file improvements'
) ON CONFLICT (migration_name) DO NOTHING;