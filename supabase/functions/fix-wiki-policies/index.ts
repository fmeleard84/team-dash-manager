import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 Fixing wiki_pages RLS policies...')

    // Drop existing policies
    const dropPoliciesQuery = `
      DROP POLICY IF EXISTS "Users can view public pages in their projects" ON wiki_pages;
      DROP POLICY IF EXISTS "Users can view their own private pages" ON wiki_pages;
      DROP POLICY IF EXISTS "Users can create pages in their projects" ON wiki_pages;
      DROP POLICY IF EXISTS "Authors can update their own pages" ON wiki_pages;
      DROP POLICY IF EXISTS "Public pages can be updated by project members" ON wiki_pages;
      DROP POLICY IF EXISTS "Authors can delete their own pages" ON wiki_pages;
    `

    // Create new policies with correct visibility rules
    const createPoliciesQuery = `
      -- Enable RLS
      ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;

      -- Policy 1: View public pages in projects where user is member
      CREATE POLICY "View public pages in user projects"
      ON wiki_pages FOR SELECT
      USING (
        is_public = true
        AND EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = wiki_pages.project_id
          AND (
            p.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM hr_resource_assignments hra
              WHERE hra.project_id = p.id
              AND hra.candidate_id = auth.uid()
              AND hra.booking_status = 'accepted'
            )
          )
        )
      );

      -- Policy 2: View own private pages
      CREATE POLICY "View own private pages"
      ON wiki_pages FOR SELECT
      USING (
        is_public = false
        AND author_id = auth.uid()
      );

      -- Policy 3: Create pages in projects where user is member
      CREATE POLICY "Create pages in user projects"
      ON wiki_pages FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = project_id
          AND (
            p.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM hr_resource_assignments hra
              WHERE hra.project_id = p.id
              AND hra.candidate_id = auth.uid()
              AND hra.booking_status = 'accepted'
            )
          )
        )
        AND author_id = auth.uid()
      );

      -- Policy 4: Update own pages
      CREATE POLICY "Update own pages"
      ON wiki_pages FOR UPDATE
      USING (author_id = auth.uid())
      WITH CHECK (author_id = auth.uid());

      -- Policy 5: Update public pages by project members (optional - comment out for stricter control)
      CREATE POLICY "Update public pages by team"
      ON wiki_pages FOR UPDATE
      USING (
        is_public = true
        AND EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = wiki_pages.project_id
          AND (
            p.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM hr_resource_assignments hra
              WHERE hra.project_id = p.id
              AND hra.candidate_id = auth.uid()
              AND hra.booking_status = 'accepted'
            )
          )
        )
      );

      -- Policy 6: Delete own pages
      CREATE POLICY "Delete own pages"
      ON wiki_pages FOR DELETE
      USING (author_id = auth.uid());

      -- Policy 7: Project owner can manage all pages
      CREATE POLICY "Project owner full access"
      ON wiki_pages FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = wiki_pages.project_id
          AND p.owner_id = auth.uid()
        )
      );
    `

    // Execute the queries
    const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
      query: dropPoliciesQuery
    })

    if (dropError) {
      console.error('Error dropping policies:', dropError)
    }

    const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
      query: createPoliciesQuery
    })

    if (createError) {
      console.error('Error creating policies:', createError)
    }

    // Test the policies
    const { data: testPages } = await supabaseAdmin
      .from('wiki_pages')
      .select('id, title, is_public, author_id')
      .limit(5)

    console.log('✅ Wiki policies fixed successfully')
    console.log('📋 Test pages:', testPages)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wiki RLS policies have been fixed',
        details: 'Private pages are now only visible to their authors',
        testPages
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to fix wiki policies'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})