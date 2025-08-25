import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🚀 Applying AI validation system...')

    // 1. Ajouter les colonnes nécessaires
    const addColumnsSql = `
      -- Ajouter les colonnes de validation
      ALTER TABLE candidate_profiles 
      ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS validation_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS validation_method VARCHAR(50) DEFAULT 'ai_test',
      ADD COLUMN IF NOT EXISTS test_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_test_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS validation_notes TEXT;

      -- Mettre à jour la valeur par défaut de is_available
      ALTER TABLE candidate_profiles 
      ALTER COLUMN is_available SET DEFAULT false;

      -- Créer l'index
      CREATE INDEX IF NOT EXISTS idx_candidate_validation_status 
      ON candidate_profiles(is_validated, user_id);
    `;

    const { error: columnsError } = await supabase.rpc('exec_sql', { sql: addColumnsSql })
    if (columnsError) {
      console.error('Error adding columns:', columnsError)
    } else {
      console.log('✅ Columns added successfully')
    }

    // 2. Créer la table d'historique des tests
    const createHistoryTableSql = `
      CREATE TABLE IF NOT EXISTS candidate_test_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
        test_date TIMESTAMPTZ DEFAULT NOW(),
        score INTEGER CHECK (score >= 0 AND score <= 10),
        status VARCHAR(20) CHECK (status IN ('validated', 'pending', 'rejected')),
        questions JSONB,
        answers JSONB,
        ai_feedback TEXT,
        reviewed_by UUID REFERENCES profiles(id),
        review_date TIMESTAMPTZ,
        review_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Activer RLS
      ALTER TABLE candidate_test_history ENABLE ROW LEVEL SECURITY;

      -- Politique pour les candidats
      CREATE POLICY IF NOT EXISTS "Candidates can view own test history" ON candidate_test_history
        FOR SELECT
        USING (
          candidate_id IN (
            SELECT id FROM candidate_profiles 
            WHERE user_id = auth.uid()
          )
        );

      -- Politique pour les admins
      CREATE POLICY IF NOT EXISTS "Admins can manage all test history" ON candidate_test_history
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'hr_manager')
          )
        );
    `;

    const { error: historyError } = await supabase.rpc('exec_sql', { sql: createHistoryTableSql })
    if (historyError) {
      console.error('Error creating history table:', historyError)
    } else {
      console.log('✅ History table created successfully')
    }

    // 3. Créer les triggers d'activation automatique
    const createTriggersSql = `
      -- Trigger pour activer automatiquement les candidats validés
      CREATE OR REPLACE FUNCTION auto_activate_validated_candidate()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Si le candidat est validé, l'activer automatiquement
        IF NEW.is_validated = true AND (OLD.is_validated = false OR OLD.is_validated IS NULL) THEN
          NEW.is_available := true;
          NEW.validation_date := NOW();
          
          -- Créer une notification pour le candidat
          INSERT INTO notifications (
            user_id,
            title,
            description,
            type,
            priority
          ) VALUES (
            NEW.user_id,
            'Profil validé !',
            'Félicitations ! Votre profil a été validé. Vous pouvez maintenant accéder aux missions disponibles.',
            'success',
            'high'
          );
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_auto_activate_candidate ON candidate_profiles;
      CREATE TRIGGER trigger_auto_activate_candidate
      BEFORE UPDATE ON candidate_profiles
      FOR EACH ROW
      EXECUTE FUNCTION auto_activate_validated_candidate();

      -- Trigger pour notifier les admins
      CREATE OR REPLACE FUNCTION notify_admin_pending_validation()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Si le statut passe à 'pending'
        IF NEW.qualification_status = 'pending' AND 
           (OLD.qualification_status IS NULL OR OLD.qualification_status != 'pending') THEN
          
          -- Créer une notification pour tous les admins
          INSERT INTO notifications (
            user_id,
            title,
            description,
            type,
            priority,
            data
          )
          SELECT 
            p.id,
            'Validation candidat requise',
            format('Le candidat %s %s (score: %s/10) attend une validation manuelle.', 
                   NEW.first_name, 
                   NEW.last_name, 
                   NEW.qualification_score),
            'admin_action',
            'high',
            jsonb_build_object(
              'candidate_id', NEW.id,
              'candidate_name', NEW.first_name || ' ' || NEW.last_name,
              'score', NEW.qualification_score
            )
          FROM profiles p
          WHERE p.role IN ('admin', 'hr_manager');
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_notify_pending_validation ON candidate_profiles;
      CREATE TRIGGER trigger_notify_pending_validation
      AFTER UPDATE ON candidate_profiles
      FOR EACH ROW
      EXECUTE FUNCTION notify_admin_pending_validation();
    `;

    const { error: triggersError } = await supabase.rpc('exec_sql', { sql: createTriggersSql })
    if (triggersError) {
      console.error('Error creating triggers:', triggersError)
    } else {
      console.log('✅ Triggers created successfully')
    }

    // 4. Créer la fonction pour vérifier si un candidat peut repasser le test
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION can_retake_test(p_candidate_id UUID)
      RETURNS BOOLEAN AS $$
      DECLARE
        v_last_test_date TIMESTAMPTZ;
        v_test_attempts INTEGER;
        v_is_validated BOOLEAN;
      BEGIN
        SELECT last_test_date, test_attempts, is_validated
        INTO v_last_test_date, v_test_attempts, v_is_validated
        FROM candidate_profiles
        WHERE id = p_candidate_id;
        
        -- Si déjà validé, pas besoin de repasser
        IF v_is_validated THEN
          RETURN FALSE;
        END IF;
        
        -- Première tentative
        IF v_test_attempts IS NULL OR v_test_attempts = 0 THEN
          RETURN TRUE;
        END IF;
        
        -- Attendre 24h entre chaque tentative
        IF v_last_test_date IS NOT NULL AND 
           v_last_test_date + INTERVAL '24 hours' > NOW() THEN
          RETURN FALSE;
        END IF;
        
        -- Maximum 3 tentatives
        IF v_test_attempts >= 3 THEN
          RETURN FALSE;
        END IF;
        
        RETURN TRUE;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: functionError } = await supabase.rpc('exec_sql', { sql: createFunctionSql })
    if (functionError) {
      console.error('Error creating function:', functionError)
    } else {
      console.log('✅ Function created successfully')
    }

    // 5. Mettre à jour les candidats existants
    const updateExistingSql = `
      -- Marquer tous les candidats existants comme non validés (sauf ceux déjà qualified)
      UPDATE candidate_profiles 
      SET 
        is_validated = CASE 
          WHEN qualification_status = 'qualified' THEN true
          ELSE false
        END,
        is_available = CASE 
          WHEN qualification_status = 'qualified' THEN is_available
          ELSE false
        END
      WHERE is_validated IS NULL;
    `;

    const { error: updateError } = await supabase.rpc('exec_sql', { sql: updateExistingSql })
    if (updateError) {
      console.error('Error updating existing candidates:', updateError)
    } else {
      console.log('✅ Existing candidates updated')
    }

    // 6. Créer la vue pour les validations en attente
    const createViewSql = `
      CREATE OR REPLACE VIEW pending_validations AS
      SELECT 
        cp.id,
        cp.user_id,
        cp.first_name,
        cp.last_name,
        cp.email,
        hp.name as job_title,
        hc.name as category,
        cp.seniority,
        cp.qualification_score,
        cp.qualification_status,
        cp.created_at,
        cth.test_date as last_test_date,
        cth.score as last_test_score
      FROM candidate_profiles cp
      LEFT JOIN hr_profiles hp ON cp.profile_id = hp.id
      LEFT JOIN hr_categories hc ON hp.category_id = hc.id
      LEFT JOIN LATERAL (
        SELECT test_date, score
        FROM candidate_test_history
        WHERE candidate_id = cp.id
        ORDER BY test_date DESC
        LIMIT 1
      ) cth ON true
      WHERE cp.is_validated = false
        AND cp.qualification_status = 'pending'
      ORDER BY cp.created_at DESC;
    `;

    const { error: viewError } = await supabase.rpc('exec_sql', { sql: createViewSql })
    if (viewError) {
      console.error('Error creating view:', viewError)
    } else {
      console.log('✅ View created successfully')
    }

    // 7. Vérifier le résultat
    const { data: stats } = await supabase
      .from('candidate_profiles')
      .select('is_validated, qualification_status')
      .limit(100)

    const validated = stats?.filter(c => c.is_validated).length || 0
    const pending = stats?.filter(c => c.qualification_status === 'pending').length || 0

    return new Response(
      JSON.stringify({
        success: true,
        message: 'AI validation system applied successfully',
        stats: {
          validated_candidates: validated,
          pending_candidates: pending,
          total_checked: stats?.length || 0
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in apply-validation-system:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})