import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { projectId, action } = await req.json();
    
    console.log(`🔄 Reset project status: ${projectId}, action: ${action}`);
    
    if (action === 'reset-to-pause') {
      // Mettre le projet en pause pour permettre un redémarrage propre
      const { data, error } = await supabase
        .from('projects')
        .update({ status: 'pause' })
        .eq('id', projectId)
        .select();
      
      if (error) {
        console.error('Error updating project status:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update project status', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('✅ Project status reset to pause');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Project status reset to pause. You can now restart it properly.',
          project: data?.[0]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in reset-project-status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});