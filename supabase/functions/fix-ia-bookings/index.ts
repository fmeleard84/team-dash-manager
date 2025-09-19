import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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

    console.log('🔧 Correction des bookings IA existants...');

    // 1. Trouver tous les bookings IA sans candidate_id
    const { data: iaBookings, error: bookingsError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        candidate_id,
        booking_status,
        project_id,
        hr_profiles!profile_id (
          id,
          name,
          is_ai
        )
      `)
      .is('candidate_id', null);

    if (bookingsError) {
      throw bookingsError;
    }

    console.log(`📊 ${iaBookings?.length || 0} bookings sans candidate_id trouvés`);

    const results = [];
    let fixedCount = 0;
    let errorCount = 0;

    if (iaBookings && iaBookings.length > 0) {
      for (const booking of iaBookings) {
        // Vérifier si c'est vraiment une ressource IA
        if (booking.hr_profiles?.is_ai) {
          try {
            // Mettre à jour le booking avec candidate_id = profile_id
            const { error: updateError } = await supabase
              .from('hr_resource_assignments')
              .update({
                candidate_id: booking.profile_id,
                booking_status: 'accepted' // S'assurer qu'elle est acceptée
              })
              .eq('id', booking.id);

            if (updateError) {
              throw updateError;
            }

            fixedCount++;
            results.push({
              booking_id: booking.id,
              profile_name: booking.hr_profiles.name,
              status: 'fixed',
              candidate_id_set: booking.profile_id
            });

            console.log(`✅ Booking ${booking.id} corrigé pour ${booking.hr_profiles.name}`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Erreur pour booking ${booking.id}:`, error);
            results.push({
              booking_id: booking.id,
              status: 'error',
              error: error.message
            });
          }
        } else {
          // C'est une ressource humaine sans candidat - probablement en recherche
          console.log(`⚠️ Booking ${booking.id} est une ressource humaine sans candidat`);
          results.push({
            booking_id: booking.id,
            status: 'skipped',
            reason: 'Ressource humaine, pas IA'
          });
        }
      }
    }

    // 2. Vérifier s'il y a des bookings IA avec le mauvais statut
    const { data: wrongStatusBookings } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        booking_status,
        hr_profiles!profile_id (
          is_ai
        )
      `)
      .neq('booking_status', 'accepted')
      .not('profile_id', 'is', null);

    let statusFixed = 0;
    if (wrongStatusBookings) {
      for (const booking of wrongStatusBookings) {
        if (booking.hr_profiles?.is_ai) {
          const { error } = await supabase
            .from('hr_resource_assignments')
            .update({ booking_status: 'accepted' })
            .eq('id', booking.id);

          if (!error) {
            statusFixed++;
            console.log(`✅ Statut corrigé pour booking ${booking.id}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bookings IA corrigés',
        summary: {
          total_checked: iaBookings?.length || 0,
          fixed: fixedCount,
          errors: errorCount,
          status_fixed: statusFixed
        },
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});