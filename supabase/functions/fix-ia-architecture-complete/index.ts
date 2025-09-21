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

    console.log('🔧 Correction complète de l\'architecture IA...');

    const results = {
      triggersApplied: false,
      iaProfilesCreated: 0,
      candidateProfilesCreated: 0,
      assignmentsFixed: 0,
      errors: []
    };

    // 1. Appliquer la migration SQL du trigger
    console.log('📋 Application de la migration trigger...');
    try {
      const migrationSql = `
        -- Fonction trigger pour auto-accepter les ressources IA
        CREATE OR REPLACE FUNCTION auto_accept_ia_bookings()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Vérifier si c'est une ressource IA qui passe en mode 'recherche'
          IF NEW.booking_status = 'recherche' AND OLD.booking_status != 'recherche' THEN
            -- Vérifier si c'est bien une ressource IA
            IF EXISTS (
              SELECT 1 FROM hr_profiles
              WHERE id = NEW.profile_id
              AND is_ai = true
            ) THEN
              -- Auto-accepter l'IA : candidate_id = profile_id et status = accepted
              NEW.candidate_id := NEW.profile_id;
              NEW.booking_status := 'accepted';

              -- Log pour debugging
              RAISE NOTICE 'Auto-acceptation IA: profile_id=% défini comme candidate_id', NEW.profile_id;
            END IF;
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Créer le trigger sur hr_resource_assignments
        DROP TRIGGER IF EXISTS auto_accept_ia_bookings_trigger ON hr_resource_assignments;

        CREATE TRIGGER auto_accept_ia_bookings_trigger
          BEFORE UPDATE ON hr_resource_assignments
          FOR EACH ROW
          EXECUTE FUNCTION auto_accept_ia_bookings();
      `;

      const { error: migrationError } = await supabase.rpc('exec_sql', {
        sql: migrationSql
      });

      if (migrationError) {
        console.error('❌ Erreur migration:', migrationError);
        results.errors.push(`Migration trigger: ${migrationError.message}`);
      } else {
        results.triggersApplied = true;
        console.log('✅ Trigger auto_accept_ia_bookings créé');
      }
    } catch (error) {
      console.error('❌ Erreur application migration:', error);
      results.errors.push(`Application migration: ${error.message}`);
    }

    // 2. Créer des ressources IA de test si aucune n'existe
    console.log('🤖 Vérification/création des ressources IA...');

    const { data: existingIAProfiles } = await supabase
      .from('hr_profiles')
      .select('*')
      .eq('is_ai', true);

    if (!existingIAProfiles || existingIAProfiles.length === 0) {
      console.log('🆕 Création de ressources IA de base...');

      // Trouver ou créer une catégorie IA
      let { data: iaCategory } = await supabase
        .from('hr_categories')
        .select('*')
        .ilike('name', '%ia%')
        .single();

      if (!iaCategory) {
        const { data: newCategory, error: categoryError } = await supabase
          .from('hr_categories')
          .insert({ name: 'Intelligence Artificielle' })
          .select()
          .single();

        if (categoryError) {
          console.error('❌ Erreur création catégorie IA:', categoryError);
          results.errors.push(`Création catégorie: ${categoryError.message}`);
        } else {
          iaCategory = newCategory;
          console.log('✅ Catégorie IA créée');
        }
      }

      if (iaCategory) {
        // Créer quelques ressources IA de base
        const iaResources = [
          { name: 'IA Rédacteur', base_price: 450 },
          { name: 'IA Chef de Projet', base_price: 650 },
          { name: 'IA Développeur', base_price: 750 }
        ];

        for (const resource of iaResources) {
          const { data: newProfile, error: profileError } = await supabase
            .from('hr_profiles')
            .insert({
              name: resource.name,
              category_id: iaCategory.id,
              base_price: resource.base_price,
              is_ai: true
            })
            .select()
            .single();

          if (profileError) {
            console.error(`❌ Erreur création ${resource.name}:`, profileError);
            results.errors.push(`Profil ${resource.name}: ${profileError.message}`);
          } else {
            results.iaProfilesCreated++;
            console.log(`✅ Ressource IA créée: ${resource.name} (ID: ${newProfile.id})`);
          }
        }
      }
    }

    // 3. Récupérer toutes les ressources IA (existantes + nouvelles)
    const { data: allIAProfiles } = await supabase
      .from('hr_profiles')
      .select('*')
      .eq('is_ai', true);

    if (allIAProfiles && allIAProfiles.length > 0) {
      console.log(`🔄 Traitement de ${allIAProfiles.length} ressource(s) IA...`);

      for (const iaProfile of allIAProfiles) {
        // 4. Créer le profil candidat correspondant selon l'architecture unifiée
        const { data: existingCandidate } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', iaProfile.id)
          .single();

        if (!existingCandidate) {
          console.log(`👤 Création profil candidat pour ${iaProfile.name}...`);

          // D'abord créer le profil dans la table profiles
          const { data: userProfile, error: userProfileError } = await supabase
            .from('profiles')
            .insert({
              id: iaProfile.id, // MÊME ID que hr_profiles selon l'architecture unifiée
              email: `${iaProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
              first_name: 'IA',
              role: 'candidate'
            })
            .select()
            .single();

          if (userProfileError && !userProfileError.message.includes('duplicate')) {
            console.error(`❌ Erreur profil user pour ${iaProfile.name}:`, userProfileError);
            results.errors.push(`User profile ${iaProfile.name}: ${userProfileError.message}`);
            continue;
          }

          // Ensuite créer le profil candidat
          const { data: candidateProfile, error: candidateError } = await supabase
            .from('candidate_profiles')
            .insert({
              id: iaProfile.id, // MÊME ID que hr_profiles
              first_name: 'IA',
              last_name: iaProfile.name.replace('IA ', ''),
              email: `${iaProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
              position: iaProfile.name,
              seniority: 'expert', // Les IA sont toujours expertes
              status: 'disponible', // Toujours disponibles
              profile_id: iaProfile.id,
              daily_rate: iaProfile.base_price || 500,
              is_email_verified: true
            })
            .select()
            .single();

          if (candidateError && !candidateError.message.includes('duplicate')) {
            console.error(`❌ Erreur profil candidat pour ${iaProfile.name}:`, candidateError);
            results.errors.push(`Candidat profile ${iaProfile.name}: ${candidateError.message}`);
          } else {
            results.candidateProfilesCreated++;
            console.log(`✅ Profil candidat créé pour ${iaProfile.name}`);
          }
        } else {
          console.log(`ℹ️ Profil candidat existe déjà pour ${iaProfile.name}`);
        }

        // 5. Corriger les assignations existantes pour cette IA
        const { data: iaAssignments } = await supabase
          .from('hr_resource_assignments')
          .select('*')
          .eq('profile_id', iaProfile.id)
          .is('candidate_id', null);

        if (iaAssignments && iaAssignments.length > 0) {
          console.log(`🔧 Correction de ${iaAssignments.length} assignation(s) pour ${iaProfile.name}...`);

          for (const assignment of iaAssignments) {
            const { error: updateError } = await supabase
              .from('hr_resource_assignments')
              .update({
                candidate_id: iaProfile.id,
                booking_status: 'accepted'
              })
              .eq('id', assignment.id);

            if (updateError) {
              console.error(`❌ Erreur correction assignation ${assignment.id}:`, updateError);
              results.errors.push(`Assignment ${assignment.id}: ${updateError.message}`);
            } else {
              results.assignmentsFixed++;
              console.log(`✅ Assignation ${assignment.id} corrigée`);
            }
          }
        }
      }
    }

    // 6. Résumé final
    console.log('📊 Résumé de la correction:');
    console.log(`   - Triggers appliqués: ${results.triggersApplied}`);
    console.log(`   - Ressources IA créées: ${results.iaProfilesCreated}`);
    console.log(`   - Profils candidats créés: ${results.candidateProfilesCreated}`);
    console.log(`   - Assignations corrigées: ${results.assignmentsFixed}`);
    console.log(`   - Erreurs: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Architecture IA corrigée avec succès',
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