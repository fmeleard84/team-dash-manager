import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer la structure des tables principales
    const tables = [
      'profiles',
      'candidate_profiles',
      'client_profiles',
      'projects',
      'hr_resource_assignments',
      'hr_profiles',
      'hr_categories',
      'project_events',
      'project_event_attendees',
      'messages',
      'kanban_boards',
      'drive_folders',
      'drive_files'
    ];

    const schemaInfo = [];

    for (const table of tables) {
      // Récupérer les colonnes
      const { data: columns, error } = await supabase
        .rpc('get_table_columns', { table_name: table })
        .single();

      if (!error) {
        schemaInfo.push({
          table,
          columns: columns || 'Table not found'
        });
      } else {
        schemaInfo.push({
          table,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        schema: schemaInfo,
        message: 'Schema information retrieved'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});