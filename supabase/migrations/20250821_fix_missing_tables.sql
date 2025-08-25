-- ============================================
-- Migration pour corriger les tables et fonctions manquantes
-- ============================================

-- 1. Créer la table notifications si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT,
  priority TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  message TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS pour notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Politique pour que chaque utilisateur ne voit que ses notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Créer la fonction RPC get_user_projects
CREATE OR REPLACE FUNCTION public.get_user_projects(user_email TEXT)
RETURNS TABLE (
  project_id UUID,
  project_title TEXT,
  project_description TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  role TEXT,
  assignment_id UUID,
  booking_status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id as project_id,
    p.title as project_title,
    p.description as project_description,
    p.status,
    p.created_at,
    p.updated_at,
    CASE 
      WHEN p.owner_id = auth.uid() THEN 'owner'
      ELSE 'candidate'
    END as role,
    hra.id as assignment_id,
    hra.booking_status
  FROM projects p
  LEFT JOIN hr_resource_assignments hra ON hra.project_id = p.id
  LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
  WHERE 
    p.owner_id = auth.uid() -- User owns the project
    OR cp.email = user_email -- User is assigned as candidate
    OR hra.candidate_id IN (
      SELECT id FROM candidate_profiles WHERE email = user_email
    )
  ORDER BY p.created_at DESC;
END;
$$;

-- 3. Ajouter la colonne status à candidate_profiles si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'candidate_profiles' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE candidate_profiles 
    ADD COLUMN status TEXT DEFAULT 'disponible' 
    CHECK (status IN ('disponible', 'indisponible', 'en_pause'));
  END IF;
END $$;

-- 4. Fonction pour obtenir les projets d'un utilisateur (version simplifiée)
CREATE OR REPLACE FUNCTION public.get_user_projects_simple()
RETURNS TABLE (
  project_id UUID,
  project_title TEXT,
  project_description TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  role TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as project_id,
    p.title as project_title,
    p.description as project_description,
    p.status,
    p.created_at,
    'owner'::TEXT as role
  FROM projects p
  WHERE p.owner_id = auth.uid()
  
  UNION ALL
  
  SELECT DISTINCT
    p.id as project_id,
    p.title as project_title,
    p.description as project_description,
    p.status,
    p.created_at,
    'candidate'::TEXT as role
  FROM projects p
  INNER JOIN hr_resource_assignments hra ON hra.project_id = p.id
  INNER JOIN candidate_profiles cp ON cp.id = hra.candidate_id
  WHERE cp.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  
  ORDER BY created_at DESC;
END;
$$;

-- 5. Créer une vue pour simplifier l'accès aux notifications
CREATE OR REPLACE VIEW public.user_notifications AS
SELECT 
  n.*,
  CASE 
    WHEN n.read_at IS NULL THEN 'unread'
    ELSE 'read'
  END as status
FROM public.notifications n
WHERE n.user_id = auth.uid();

-- Grant des permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_projects(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_projects_simple() TO authenticated;
GRANT SELECT ON public.user_notifications TO authenticated;

-- 6. Trigger pour mettre à jour updated_at sur notifications
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();