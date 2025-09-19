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

    console.log('🤖 Création des profils candidats pour les ressources IA...');

    // 1. Récupérer toutes les ressources IA
    const { data: iaResources, error: iaError } = await supabase
      .from('hr_profiles')
      .select('*')
      .eq('is_ai', true);

    if (iaError) {
      throw iaError;
    }

    if (!iaResources || iaResources.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Aucune ressource IA trouvée',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`📊 ${iaResources.length} ressources IA trouvées`);

    const results = [];
    const errors = [];

    for (const iaResource of iaResources) {
      try {
        // Vérifier si un profil candidat existe déjà avec cet ID
        const { data: existingProfile } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('id', iaResource.id)
          .single();

        if (existingProfile) {
          console.log(`⚠️ Profil candidat existe déjà pour ${iaResource.name}`);
          results.push({
            resource: iaResource.name,
            status: 'exists',
            id: iaResource.id,
          });
          continue;
        }

        // Créer le profil candidat pour l'IA
        // Utiliser le même ID que hr_profiles pour la cohérence
        const candidateData: any = {
          id: iaResource.id, // Même ID que hr_profiles
          first_name: 'IA',
          last_name: iaResource.name.replace('IA ', '').replace('Rédacteur ', '').replace('Concepteur rédacteur ', ''),
          email: `${iaResource.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
          phone: '+33000000000', // Numéro fictif
          status: 'disponible', // Toujours disponible
          daily_rate: iaResource.base_price || 0, // Utiliser le tarif de base
        };

        // Créer le profil
        const { data: newProfile, error: createError } = await supabase
          .from('candidate_profiles')
          .insert(candidateData)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        console.log(`✅ Profil candidat créé pour ${iaResource.name}`);
        results.push({
          resource: iaResource.name,
          status: 'created',
          id: newProfile.id,
          email: candidateData.email,
        });

      } catch (error) {
        console.error(`❌ Erreur pour ${iaResource.name}:`, error);
        errors.push({
          resource: iaResource.name,
          error: error.message,
        });
      }
    }

    // 2. Créer un trigger pour auto-accepter les bookings IA
    console.log('🔧 Création du trigger pour auto-acceptation des bookings IA...');

    const triggerSql = `
      -- Supprimer le trigger existant s'il existe
      DROP TRIGGER IF EXISTS auto_accept_ia_bookings ON hr_resource_assignments;
      DROP FUNCTION IF EXISTS auto_accept_ia_bookings();

      -- Créer la fonction qui auto-accepte les bookings pour les IA
      CREATE OR REPLACE FUNCTION auto_accept_ia_bookings()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Si c'est une ressource IA et que le statut est 'recherche'
        IF NEW.booking_status = 'recherche' AND EXISTS (
          SELECT 1 FROM hr_profiles
          WHERE id = NEW.profile_id
          AND is_ai = true
        ) THEN
          -- Auto-accepter immédiatement
          NEW.booking_status := 'accepted';
          NEW.candidate_id := NEW.profile_id; -- Utiliser le même ID

          -- Log pour debug
          RAISE NOTICE 'IA booking auto-accepté pour profile_id: %', NEW.profile_id;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Créer le trigger BEFORE INSERT OR UPDATE
      CREATE TRIGGER auto_accept_ia_bookings
      BEFORE INSERT OR UPDATE ON hr_resource_assignments
      FOR EACH ROW
      EXECUTE FUNCTION auto_accept_ia_bookings();
    `;

    try {
      await supabase.rpc('exec_sql', { sql: triggerSql });
      console.log('✅ Trigger auto-accept créé avec succès');
    } catch (triggerError) {
      console.error('⚠️ Erreur création trigger (peut déjà exister):', triggerError);
    }

    // 3. Mettre à jour les bookings existants pour les IA
    console.log('🔄 Mise à jour des bookings IA existants...');

    const { data: existingBookings, error: bookingsError } = await supabase
      .from('hr_resource_assignments')
      .select('id, profile_id')
      .in('profile_id', iaResources.map(r => r.id))
      .eq('booking_status', 'recherche');

    if (existingBookings && existingBookings.length > 0) {
      for (const booking of existingBookings) {
        const { error: updateError } = await supabase
          .from('hr_resource_assignments')
          .update({
            booking_status: 'accepted',
            candidate_id: booking.profile_id, // Utiliser le même ID que profile_id
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`❌ Erreur mise à jour booking ${booking.id}:`, updateError);
        } else {
          console.log(`✅ Booking ${booking.id} auto-accepté`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profils candidats IA créés avec succès',
        summary: {
          total: iaResources.length,
          created: results.filter(r => r.status === 'created').length,
          existing: results.filter(r => r.status === 'exists').length,
          errors: errors.length,
        },
        results,
        errors,
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