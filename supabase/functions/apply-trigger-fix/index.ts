import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // Execute the SQL directly
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    // Create a simpler function that only updates updated_at
    const fixQuery = `
      -- Drop the problematic function and recreate it
      DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
      
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Recreate the trigger for candidate_profiles
      DROP TRIGGER IF EXISTS update_candidate_profiles_updated_at ON public.candidate_profiles;
      
      CREATE TRIGGER update_candidate_profiles_updated_at
      BEFORE UPDATE ON public.candidate_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
    `;

    // Use the service role to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql: fixQuery })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to execute SQL');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Trigger fixed successfully',
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});