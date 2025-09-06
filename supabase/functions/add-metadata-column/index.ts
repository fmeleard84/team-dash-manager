import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false
      }
    });

    console.log('Adding metadata column to projects table...');

    // Use raw SQL to add the column
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        -- Add metadata column to projects table if it doesn't exist
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
        
        -- Add planning_shared column if it doesn't exist
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS planning_shared TEXT;
        
        -- Add comments
        COMMENT ON COLUMN projects.metadata IS 'Stores integration data for calendars and other services';
        COMMENT ON COLUMN projects.planning_shared IS 'URL or reference to shared planning/calendar';
        
        -- Initialize existing projects with empty metadata
        UPDATE projects 
        SET metadata = '{}'
        WHERE metadata IS NULL;
      `
    });

    if (error) {
      console.error('Error executing SQL:', error);
      
      // Try alternative approach - add columns one by one
      console.log('Trying alternative approach...');
      
      // Check if columns exist first
      const { data: columns } = await supabase
        .from('projects')
        .select('*')
        .limit(1)
        .single();
      
      if (columns) {
        const hasMetadata = 'metadata' in columns;
        const hasPlanningShared = 'planning_shared' in columns;
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Column check completed',
            columns: {
              metadata: hasMetadata ? 'exists' : 'missing',
              planning_shared: hasPlanningShared ? 'exists' : 'missing'
            },
            note: hasMetadata && hasPlanningShared 
              ? 'All required columns exist' 
              : 'Some columns are missing. Please add them manually in Supabase SQL Editor using the following SQL:\n\nALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\';\nALTER TABLE projects ADD COLUMN IF NOT EXISTS planning_shared TEXT;'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    console.log('Metadata column added successfully');
    
    // Verify the column was added
    const { data: testProject } = await supabase
      .from('projects')
      .select('id, metadata, planning_shared')
      .limit(1)
      .single();
    
    const success = testProject && 'metadata' in testProject;
    
    return new Response(
      JSON.stringify({ 
        success,
        message: success 
          ? 'Metadata and planning_shared columns added successfully!' 
          : 'Failed to add columns. Please add them manually in Supabase SQL Editor.',
        testProject: testProject ? Object.keys(testProject) : null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in add-metadata-column function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        suggestion: 'Please add the columns manually in Supabase SQL Editor:\n\nALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\';\nALTER TABLE projects ADD COLUMN IF NOT EXISTS planning_shared TEXT;'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});