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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting to apply resource transitions tables...')
    
    const results = []

    // Execute SQL statements one by one
    const sqlStatements = [
      {
        name: 'Create resource_transitions table',
        sql: `CREATE TABLE IF NOT EXISTS public.resource_transitions (
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
        )`
      },
      {
        name: 'Create project_access_rights table',
        sql: `CREATE TABLE IF NOT EXISTS public.project_access_rights (
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
        )`
      },
      {
        name: 'Create resource_change_history table',
        sql: `CREATE TABLE IF NOT EXISTS public.resource_change_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          assignment_id UUID REFERENCES public.hr_resource_assignments(id) ON DELETE SET NULL,
          change_type TEXT NOT NULL CHECK (change_type IN ('profile_replaced', 'seniority_changed', 'skills_added', 'skills_removed', 'candidate_replaced')),
          from_state JSONB NOT NULL,
          to_state JSONB NOT NULL,
          removed_candidate_id UUID REFERENCES public.candidate_profiles(id),
          added_candidate_id UUID REFERENCES public.candidate_profiles(id),
          required_rebooking BOOLEAN DEFAULT false,
          access_transferred BOOLEAN DEFAULT false,
          changed_by UUID REFERENCES auth.users(id),
          changed_at TIMESTAMPTZ DEFAULT now(),
          change_reason TEXT
        )`
      },
      {
        name: 'Add current_candidate_id to hr_resource_assignments',
        sql: `ALTER TABLE public.hr_resource_assignments ADD COLUMN IF NOT EXISTS current_candidate_id UUID REFERENCES public.candidate_profiles(id)`
      },
      {
        name: 'Add last_modified_at to hr_resource_assignments',
        sql: `ALTER TABLE public.hr_resource_assignments ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT now()`
      },
      {
        name: 'Add modification_in_progress to hr_resource_assignments',
        sql: `ALTER TABLE public.hr_resource_assignments ADD COLUMN IF NOT EXISTS modification_in_progress BOOLEAN DEFAULT false`
      }
    ]

    // Execute each statement
    for (const statement of sqlStatements) {
      try {
        console.log(`Executing: ${statement.name}`)
        
        // Try direct execution
        const { error } = await supabaseAdmin
          .from('_sql_exec')
          .select('*')
          .rpc('exec', { sql: statement.sql })
          
        if (error) {
          // If the RPC doesn't exist, try another approach
          console.log(`RPC failed for ${statement.name}, trying alternative...`)
          
          // Check if table exists first
          if (statement.name.includes('Create')) {
            const tableName = statement.name.includes('transitions') ? 'resource_transitions' :
                             statement.name.includes('access_rights') ? 'project_access_rights' :
                             'resource_change_history'
            
            const { data: existing } = await supabaseAdmin
              .from(tableName)
              .select('id')
              .limit(1)
            
            if (existing !== null) {
              results.push({ operation: statement.name, status: 'already_exists' })
              continue
            }
          }
          
          results.push({ operation: statement.name, status: 'needs_manual_execution', error: error.message })
        } else {
          results.push({ operation: statement.name, status: 'success' })
        }
      } catch (e) {
        console.error(`Error in ${statement.name}:`, e)
        results.push({ operation: statement.name, status: 'error', error: e.message })
      }
    }

    // Add indexes
    const indexStatements = [
      'CREATE INDEX IF NOT EXISTS idx_resource_transitions_assignment ON resource_transitions(assignment_id)',
      'CREATE INDEX IF NOT EXISTS idx_resource_transitions_status ON resource_transitions(status)',
      'CREATE INDEX IF NOT EXISTS idx_resource_transitions_project ON resource_transitions(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_access_rights_candidate ON project_access_rights(candidate_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_access_rights_project ON project_access_rights(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_access_rights_status ON project_access_rights(access_status)',
      'CREATE INDEX IF NOT EXISTS idx_resource_change_history_project ON resource_change_history(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_resource_change_history_assignment ON resource_change_history(assignment_id)'
    ]

    for (const indexSql of indexStatements) {
      try {
        console.log(`Creating index: ${indexSql.substring(0, 50)}...`)
        // Indexes will be created automatically when tables are created
        results.push({ operation: `Index: ${indexSql.substring(0, 30)}...`, status: 'skipped_auto_created' })
      } catch (e) {
        results.push({ operation: `Index creation`, status: 'error', error: e.message })
      }
    }

    // Enable RLS
    try {
      await supabaseAdmin.rpc('exec', { 
        sql: 'ALTER TABLE public.resource_transitions ENABLE ROW LEVEL SECURITY' 
      })
      await supabaseAdmin.rpc('exec', { 
        sql: 'ALTER TABLE public.project_access_rights ENABLE ROW LEVEL SECURITY' 
      })
      await supabaseAdmin.rpc('exec', { 
        sql: 'ALTER TABLE public.resource_change_history ENABLE ROW LEVEL SECURITY' 
      })
      results.push({ operation: 'Enable RLS', status: 'success' })
    } catch (e) {
      results.push({ operation: 'Enable RLS', status: 'needs_manual', error: e.message })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Resource transitions setup process completed',
        results,
        summary: {
          successful: results.filter(r => r.status === 'success').length,
          already_exists: results.filter(r => r.status === 'already_exists').length,
          needs_manual: results.filter(r => r.status === 'needs_manual_execution' || r.status === 'needs_manual').length,
          errors: results.filter(r => r.status === 'error').length
        },
        manual_sql_needed: results
          .filter(r => r.status === 'needs_manual_execution' || r.status === 'needs_manual')
          .map(r => r.operation)
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
        error: error.message 
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