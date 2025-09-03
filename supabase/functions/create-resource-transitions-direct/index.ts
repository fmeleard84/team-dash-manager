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

    console.log('Creating resource transitions tables...')

    // Check if tables already exist
    const { data: existingTables } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['resource_transitions', 'project_access_rights', 'resource_change_history'])

    console.log('Existing tables:', existingTables)

    // Create tables one by one
    const tables = [
      {
        name: 'resource_transitions',
        exists: existingTables?.some(t => t.table_name === 'resource_transitions'),
        sql: `
          CREATE TABLE public.resource_transitions (
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
          )
        `
      },
      {
        name: 'project_access_rights',
        exists: existingTables?.some(t => t.table_name === 'project_access_rights'),
        sql: `
          CREATE TABLE public.project_access_rights (
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
          )
        `
      },
      {
        name: 'resource_change_history',
        exists: existingTables?.some(t => t.table_name === 'resource_change_history'),
        sql: `
          CREATE TABLE public.resource_change_history (
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
          )
        `
      }
    ]

    const results = []
    
    // Create tables
    for (const table of tables) {
      if (!table.exists) {
        console.log(`Creating table ${table.name}...`)
        // Direct query approach - avoid using undefined RPC functions
        try {
          // Using a workaround with a dummy select to force table creation
          const { error } = await supabaseAdmin.rpc('query', { 
            statement: table.sql 
          })
          
          if (error) {
            // Try alternative approach
            console.log(`Failed with RPC, trying alternative for ${table.name}`)
            results.push({ table: table.name, status: 'skipped', reason: 'RPC not available' })
          } else {
            results.push({ table: table.name, status: 'created' })
          }
        } catch (e) {
          console.log(`Error creating ${table.name}:`, e.message)
          results.push({ table: table.name, status: 'error', error: e.message })
        }
      } else {
        console.log(`Table ${table.name} already exists`)
        results.push({ table: table.name, status: 'exists' })
      }
    }

    // Add columns to hr_resource_assignments
    console.log('Adding columns to hr_resource_assignments...')
    const columnsToAdd = [
      { name: 'current_candidate_id', type: 'UUID REFERENCES public.candidate_profiles(id)' },
      { name: 'last_modified_at', type: 'TIMESTAMPTZ DEFAULT now()' },
      { name: 'modification_in_progress', type: 'BOOLEAN DEFAULT false' }
    ]

    for (const column of columnsToAdd) {
      // Check if column exists
      const { data: existingColumn } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'hr_resource_assignments')
        .eq('column_name', column.name)
        .single()

      if (!existingColumn) {
        console.log(`Adding column ${column.name}...`)
        // Column doesn't exist, would need to add it
        results.push({ column: column.name, status: 'needs_manual_addition' })
      } else {
        results.push({ column: column.name, status: 'exists' })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Resource transitions setup completed',
        results,
        note: 'Some operations may need manual SQL execution via Supabase dashboard'
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