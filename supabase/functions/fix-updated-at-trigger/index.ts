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

    // Fix the update_updated_at_column function
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Fix the update_updated_at_column function to not update last_seen
        CREATE OR REPLACE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create a specific function for tables with last_seen
        CREATE OR REPLACE FUNCTION public.update_presence_timestamps()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            IF TG_TABLE_NAME = 'user_presence' THEN
                NEW.last_seen = NOW();
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (funcError) {
      console.error('Error fixing functions:', funcError);
      return new Response(
        JSON.stringify({ error: funcError.message }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Functions fixed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});