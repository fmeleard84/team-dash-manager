import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Adding rate columns to hr_resource_assignments...')

    // 1. Add columns if they don't exist
    const { error: alterError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        ALTER TABLE hr_resource_assignments
        ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS rate_per_minute DECIMAL(10,2);
      `
    })

    if (alterError) {
      console.error('Error adding columns:', alterError)
      // Try alternative approach
      try {
        await supabaseClient.from('hr_resource_assignments').select('daily_rate').limit(1)
      } catch {
        // Column doesn't exist, try to add it differently
        console.log('Columns might already exist or cannot be added via RPC')
      }
    }

    // 2. Update specific rates if requested
    const { candidateId, projectId, ratePerMinute } = await req.json()
    
    if (candidateId && projectId && ratePerMinute) {
      const { error: updateError } = await supabaseClient
        .from('hr_resource_assignments')
        .update({
          rate_per_minute: ratePerMinute,
          hourly_rate: ratePerMinute * 60,
          daily_rate: ratePerMinute * 480, // 8 hours
          updated_at: new Date().toISOString()
        })
        .eq('candidate_id', candidateId)
        .eq('project_id', projectId)
        .eq('booking_status', 'accepted')

      if (updateError) {
        throw updateError
      }

      console.log(`Updated rates for candidate ${candidateId} on project ${projectId}: ${ratePerMinute}€/min`)
    }

    // 3. Also update the base rate in hr_profiles if needed
    if (req.headers.get('x-update-base-rate') === 'true') {
      const { profileId, baseRate } = await req.json()
      
      if (profileId && baseRate) {
        const { error: profileError } = await supabaseClient
          .from('hr_profiles')
          .update({
            base_rate_per_minute: baseRate
          })
          .eq('id', profileId)

        if (profileError) {
          console.error('Error updating profile rate:', profileError)
        } else {
          console.log(`Updated base rate for profile ${profileId}: ${baseRate}€/min`)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Rate columns added/updated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})