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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fix the trigger function
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop and recreate the function to only update updated_at
        DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
        
        CREATE OR REPLACE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Recreate the trigger for candidate_profiles
        CREATE TRIGGER update_candidate_profiles_updated_at
            BEFORE UPDATE ON public.candidate_profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
            
        -- Recreate trigger for profiles
        CREATE TRIGGER update_profiles_updated_at
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
      `
    });

    if (error) {
      console.error('Error fixing trigger:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Trigger fixed successfully'
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