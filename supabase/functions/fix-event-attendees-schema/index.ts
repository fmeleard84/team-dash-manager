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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('🔧 Fixing project_event_attendees schema to match TypeScript types')

    // Step 1: Add missing columns
    console.log('📋 Step 1: Adding missing columns...')
    const addColumnsSql = `
      -- Add the 'required' column that TypeScript types expect
      ALTER TABLE project_event_attendees 
      ADD COLUMN IF NOT EXISTS required boolean DEFAULT true;

      -- Add the 'updated_at' column that TypeScript types expect  
      ALTER TABLE project_event_attendees 
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    `

    const { data: addResult, error: addError } = await supabaseAdmin.rpc('exec_sql', { sql: addColumnsSql })
    
    if (addError) {
      console.error('❌ Error adding columns:', addError)
      throw addError
    }
    console.log('✅ Columns added successfully')

    // Step 2: Check if status column exists and rename it
    console.log('📋 Step 2: Renaming status column to response_status...')
    
    // First check if status column exists and response_status doesn't
    const checkColumnsSql = `
      SELECT 
        COUNT(*) FILTER (WHERE column_name = 'status') as has_status,
        COUNT(*) FILTER (WHERE column_name = 'response_status') as has_response_status
      FROM information_schema.columns 
      WHERE table_name = 'project_event_attendees' 
      AND table_schema = 'public';
    `

    const { data: checkResult, error: checkError } = await supabaseAdmin.rpc('exec_sql', { sql: checkColumnsSql })
    
    if (checkError) {
      console.error('❌ Error checking columns:', checkError)
      throw checkError
    }

    console.log('📊 Column check result:', checkResult)

    // Only rename if status exists and response_status doesn't exist
    if (checkResult && checkResult.length > 0) {
      const row = checkResult[0]
      if (row.has_status > 0 && row.has_response_status === 0) {
        console.log('🔄 Renaming status to response_status...')
        const renameSql = `
          ALTER TABLE project_event_attendees 
          RENAME COLUMN status TO response_status;
        `
        
        const { data: renameResult, error: renameError } = await supabaseAdmin.rpc('exec_sql', { sql: renameSql })
        
        if (renameError) {
          console.error('❌ Error renaming column:', renameError)
          throw renameError
        }
        console.log('✅ Column renamed successfully')
      } else {
        console.log('ℹ️ Column rename not needed (status does not exist or response_status already exists)')
      }
    }

    // Step 3: Create update trigger
    console.log('📋 Step 3: Creating update trigger...')
    const triggerSql = `
      -- Create trigger to automatically update updated_at column
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Add trigger if it doesn't exist
      DROP TRIGGER IF EXISTS update_project_event_attendees_updated_at ON project_event_attendees;
      CREATE TRIGGER update_project_event_attendees_updated_at
        BEFORE UPDATE ON project_event_attendees
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `

    const { data: triggerResult, error: triggerError } = await supabaseAdmin.rpc('exec_sql', { sql: triggerSql })
    
    if (triggerError) {
      console.error('❌ Error creating trigger:', triggerError)
      throw triggerError
    }
    console.log('✅ Update trigger created successfully')

    // Step 4: Update any existing records to have proper defaults
    console.log('📋 Step 4: Updating existing records...')
    const updateExistingSql = `
      UPDATE project_event_attendees 
      SET 
        required = COALESCE(required, true),
        response_status = COALESCE(response_status, 'invited'),
        updated_at = COALESCE(updated_at, created_at, now())
      WHERE required IS NULL OR response_status IS NULL OR updated_at IS NULL;
    `

    const { data: updateResult, error: updateError } = await supabaseAdmin.rpc('exec_sql', { sql: updateExistingSql })
    
    if (updateError) {
      console.error('❌ Error updating existing records:', updateError)
      throw updateError
    }
    console.log('✅ Existing records updated successfully')

    console.log('🎉 Schema fix completed successfully!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'project_event_attendees schema fixed successfully',
        steps: [
          'Added required and updated_at columns',
          'Renamed status to response_status if needed',
          'Created update trigger',
          'Updated existing records'
        ]
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})