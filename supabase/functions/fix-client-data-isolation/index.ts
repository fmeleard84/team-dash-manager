import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔒 Fixing client data isolation...')

    // 1. Drop all existing policies on projects table
    await supabaseAdmin.rpc('exec_sql', { 
      sql: `
        -- Drop all existing policies on projects
        DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
        DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
        DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
        DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
        DROP POLICY IF EXISTS "Enable all operations for project owners" ON projects;
        DROP POLICY IF EXISTS "Admins have full access to projects" ON projects;
        DROP POLICY IF EXISTS "Project visibility" ON projects;
        DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON projects;
        DROP POLICY IF EXISTS "Enable update for project owners" ON projects;
        DROP POLICY IF EXISTS "Enable delete for project owners" ON projects;
      `
    })

    // 2. Create strict RLS policies for projects
    await supabaseAdmin.rpc('exec_sql', { 
      sql: `
        -- CRITICAL: Only owners can see their projects
        CREATE POLICY "Clients can only view their own projects" ON projects
          FOR SELECT USING (auth.uid() = owner_id);
        
        CREATE POLICY "Clients can create projects" ON projects
          FOR INSERT WITH CHECK (auth.uid() = owner_id);
        
        CREATE POLICY "Clients can update their own projects" ON projects
          FOR UPDATE USING (auth.uid() = owner_id)
          WITH CHECK (auth.uid() = owner_id);
        
        CREATE POLICY "Clients can delete their own projects" ON projects
          FOR DELETE USING (auth.uid() = owner_id);
      `
    })

    // 3. Fix kanban_columns policies
    await supabaseAdmin.rpc('exec_sql', { 
      sql: `
        DROP POLICY IF EXISTS "Enable read access for all users" ON kanban_columns;
        DROP POLICY IF EXISTS "Enable all operations for project members" ON kanban_columns;
        
        -- Only allow access to kanban columns of owned projects
        CREATE POLICY "Access kanban columns of owned projects" ON kanban_columns
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM projects 
              WHERE projects.id = kanban_columns.project_id 
              AND projects.owner_id = auth.uid()
            )
          );
      `
    })

    // 4. Fix kanban_cards policies  
    await supabaseAdmin.rpc('exec_sql', { 
      sql: `
        DROP POLICY IF EXISTS "Enable read access for all users" ON kanban_cards;
        DROP POLICY IF EXISTS "Enable all operations for project members" ON kanban_cards;
        
        -- Only allow access to kanban cards of owned projects
        CREATE POLICY "Access kanban cards of owned projects" ON kanban_cards
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM kanban_columns kc
              JOIN projects p ON p.id = kc.project_id
              WHERE kc.id = kanban_cards.column_id 
              AND p.owner_id = auth.uid()
            )
          );
      `
    })

    // 5. Fix message_threads policies
    await supabaseAdmin.rpc('exec_sql', { 
      sql: `
        DROP POLICY IF EXISTS "Enable read access for all users" ON message_threads;
        DROP POLICY IF EXISTS "Users can view threads they participate in" ON message_threads;
        
        -- Only allow access to message threads of owned projects
        CREATE POLICY "Access message threads of owned projects" ON message_threads
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM projects 
              WHERE projects.id = message_threads.project_id 
              AND projects.owner_id = auth.uid()
            )
          );
      `
    })

    // 6. Fix messages policies
    await supabaseAdmin.rpc('exec_sql', { 
      sql: `
        DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
        DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
        
        -- Only allow access to messages of owned projects
        CREATE POLICY "Access messages of owned projects" ON messages
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM message_threads mt
              JOIN projects p ON p.id = mt.project_id
              WHERE mt.id = messages.thread_id 
              AND p.owner_id = auth.uid()
            )
          );
      `
    })

    // 7. Fix project_files policies
    await supabaseAdmin.rpc('exec_sql', { 
      sql: `
        DROP POLICY IF EXISTS "Enable read access for all users" ON project_files;
        
        -- Only allow access to files of owned projects
        CREATE POLICY "Access files of owned projects" ON project_files
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM projects 
              WHERE projects.id = project_files.project_id 
              AND projects.owner_id = auth.uid()
            )
          );
      `
    })

    console.log('✅ Client data isolation fixed successfully!')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Client data isolation has been fixed. Each client can now only see their own projects.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})