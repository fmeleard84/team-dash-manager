import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Adding booking_data column to hr_resource_assignments...');

    // Try to add the column directly - if it fails it probably already exists
    const { error: addColumnError } = await supabase
      .rpc('exec_sql', { 
        sql: "ALTER TABLE public.hr_resource_assignments ADD COLUMN booking_data JSONB DEFAULT '{}'::jsonb;" 
      });

    console.log('Add column result:', addColumnError);

    // Try to create the index
    const { error: indexError } = await supabase
      .rpc('exec_sql', { 
        sql: "CREATE INDEX IF NOT EXISTS idx_hr_resource_assignments_booking_candidate ON public.hr_resource_assignments USING GIN ((booking_data->>'candidate_email'));" 
      });

    console.log('Create index result:', indexError);

    // Don't fail if column already exists - that's expected
    let message = 'booking_data operations completed';
    if (addColumnError && !addColumnError.message?.includes('already exists')) {
      console.error('Unexpected add column error:', addColumnError);
      throw addColumnError;
    } else if (addColumnError?.message?.includes('already exists')) {
      message = 'booking_data column already exists';
    } else {
      message = 'booking_data column added successfully';
    }

    return new Response(
      JSON.stringify({ success: true, message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});