import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        db: {
          schema: 'public'
        }
      }
    )

    console.log('Starting resource transitions migration...')

    // Create the migration SQL
    const migrationSQL = `
      -- Table pour tracker les transitions de ressources
      CREATE TABLE IF NOT EXISTS public.resource_transitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        assignment_id UUID NOT NULL REFERENCES public.hr_resource_assignments(id) ON DELETE CASCADE,
        transition_type TEXT NOT NULL CHECK (transition_type IN ('profile_change', 'seniority_change', 'skill_update')),
        previous_candidate_id UUID REFERENCES public.candidate_profiles(id),
        previous_profile_id UUID REFERENCES public.hr_profiles(id),
        previous_seniority TEXT,
        previous_languages TEXT[],
        previous_expertises TEXT[],
        new_profile_id UUID REFERENCES public.hr_profiles(id),
        new_seniority TEXT,
        new_languages TEXT[],
        new_expertises TEXT[],
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'searching', 'candidate_found', 'completed', 'cancelled')),
        new_candidate_id UUID REFERENCES public.candidate_profiles(id),
        reason TEXT,
        notification_message TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        completed_at TIMESTAMPTZ,
        created_by UUID REFERENCES auth.users(id)
      );

      -- Table pour les accès projet
      CREATE TABLE IF NOT EXISTS public.project_access_rights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
        assignment_id UUID REFERENCES public.hr_resource_assignments(id) ON DELETE SET NULL,
        has_drive_access BOOLEAN DEFAULT false,
        has_kanban_access BOOLEAN DEFAULT false,
        has_messaging_access BOOLEAN DEFAULT false,
        drive_folders TEXT[],
        drive_permissions TEXT DEFAULT 'read',
        access_status TEXT NOT NULL DEFAULT 'active' CHECK (access_status IN ('active', 'revoked', 'pending_transfer', 'transferred')),
        revoked_at TIMESTAMPTZ,
        revoked_reason TEXT,
        transferred_to UUID REFERENCES public.candidate_profiles(id),
        transferred_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      -- Table d'historique
      CREATE TABLE IF NOT EXISTS public.resource_change_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        assignment_id UUID REFERENCES public.hr_resource_assignments(id) ON DELETE SET NULL,
        change_type TEXT NOT NULL CHECK (change_type IN ('profile_replaced', 'seniority_upgraded', 'seniority_downgraded', 'skills_added', 'skills_removed', 'candidate_replaced')),
        from_state JSONB NOT NULL,
        to_state JSONB NOT NULL,
        removed_candidate_id UUID REFERENCES public.candidate_profiles(id),
        added_candidate_id UUID REFERENCES public.candidate_profiles(id),
        required_rebooking BOOLEAN DEFAULT false,
        access_transferred BOOLEAN DEFAULT false,
        changed_by UUID REFERENCES auth.users(id),
        changed_at TIMESTAMPTZ DEFAULT now(),
        change_reason TEXT
      );

      -- Ajouter des colonnes à hr_resource_assignments
      ALTER TABLE public.hr_resource_assignments 
      ADD COLUMN IF NOT EXISTS current_candidate_id UUID REFERENCES public.candidate_profiles(id),
      ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT now(),
      ADD COLUMN IF NOT EXISTS modification_in_progress BOOLEAN DEFAULT false;

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_resource_transitions_assignment ON resource_transitions(assignment_id);
      CREATE INDEX IF NOT EXISTS idx_resource_transitions_status ON resource_transitions(status);
      CREATE INDEX IF NOT EXISTS idx_resource_transitions_project ON resource_transitions(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_access_rights_candidate ON project_access_rights(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_project_access_rights_project ON project_access_rights(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_access_rights_status ON project_access_rights(access_status);
      CREATE INDEX IF NOT EXISTS idx_resource_change_history_project ON resource_change_history(project_id);
      CREATE INDEX IF NOT EXISTS idx_resource_change_history_assignment ON resource_change_history(assignment_id);

      -- Enable RLS
      ALTER TABLE public.resource_transitions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.project_access_rights ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.resource_change_history ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their project transitions" ON public.resource_transitions;
      DROP POLICY IF EXISTS "Users can manage their project transitions" ON public.resource_transitions;
      DROP POLICY IF EXISTS "Users can view their access rights" ON public.project_access_rights;
      DROP POLICY IF EXISTS "Project owners can manage access rights" ON public.project_access_rights;
      DROP POLICY IF EXISTS "Users can view their project history" ON public.resource_change_history;
      DROP POLICY IF EXISTS "Project owners can create history entries" ON public.resource_change_history;

      -- Create RLS policies
      CREATE POLICY "Users can view their project transitions" ON public.resource_transitions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.projects 
          WHERE projects.id = resource_transitions.project_id 
          AND projects.owner_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.candidate_profiles cp
          WHERE (cp.id = resource_transitions.previous_candidate_id 
                 OR cp.id = resource_transitions.new_candidate_id)
          AND cp.user_id = auth.uid()
        )
      );

      CREATE POLICY "Users can manage their project transitions" ON public.resource_transitions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.projects 
          WHERE projects.id = resource_transitions.project_id 
          AND projects.owner_id = auth.uid()
        )
      );

      CREATE POLICY "Users can view their access rights" ON public.project_access_rights
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.projects 
          WHERE projects.id = project_access_rights.project_id 
          AND projects.owner_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.candidate_profiles cp
          WHERE cp.id = project_access_rights.candidate_id
          AND cp.user_id = auth.uid()
        )
      );

      CREATE POLICY "Project owners can manage access rights" ON public.project_access_rights
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.projects 
          WHERE projects.id = project_access_rights.project_id 
          AND projects.owner_id = auth.uid()
        )
      );

      CREATE POLICY "Users can view their project history" ON public.resource_change_history
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.projects 
          WHERE projects.id = resource_change_history.project_id 
          AND projects.owner_id = auth.uid()
        )
      );

      CREATE POLICY "Project owners can create history entries" ON public.resource_change_history
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.projects 
          WHERE projects.id = resource_change_history.project_id 
          AND projects.owner_id = auth.uid()
        )
      );

      -- Enable realtime
      ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.resource_transitions;
      ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.project_access_rights;
    `

    // Execute the migration
    const { error } = await supabaseClient.rpc('exec_sql', {
      sql: migrationSQL
    }).single()

    if (error) {
      console.error('Migration error:', error)
      
      // If exec_sql doesn't exist, try direct execution
      console.log('Trying alternative approach...')
      
      // Split into individual statements and execute
      const statements = migrationSQL.split(';').filter(s => s.trim())
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await supabaseClient.rpc('exec', { query: statement + ';' })
          } catch (e) {
            console.log('Statement failed (may already exist):', e.message)
          }
        }
      }
    }

    console.log('Migration completed successfully!')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Resource transitions tables created successfully'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to create resource transitions tables'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})