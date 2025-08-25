import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Starting migration from profile_id to candidate_id...');
    
    const results = {
      analyzed: 0,
      migrated: 0,
      created: 0,
      errors: []
    };

    // 1. Récupérer toutes les assignations qui utilisent encore profile_id
    const { data: oldAssignments, error: fetchError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .not('profile_id', 'is', null)
      .is('candidate_id', null);

    if (fetchError) {
      throw new Error(`Error fetching assignments: ${fetchError.message}`);
    }

    console.log(`Found ${oldAssignments?.length || 0} assignments using old profile_id system`);
    results.analyzed = oldAssignments?.length || 0;

    if (oldAssignments && oldAssignments.length > 0) {
      for (const assignment of oldAssignments) {
        try {
          console.log(`\nProcessing assignment ${assignment.id}...`);
          
          // 2. Récupérer le hr_profile
          const { data: hrProfile, error: hrError } = await supabase
            .from('hr_profiles')
            .select('*')
            .eq('id', assignment.profile_id)
            .single();

          if (hrError || !hrProfile) {
            console.error(`  ❌ hr_profile not found for ${assignment.profile_id}`);
            results.errors.push(`hr_profile not found: ${assignment.profile_id}`);
            continue;
          }

          console.log(`  Found hr_profile: ${hrProfile.name || 'Unknown'}`);

          // 3. Si hr_profile a un profile_id, chercher ou créer le candidate_profile
          if (hrProfile.profile_id) {
            // Récupérer le profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', hrProfile.profile_id)
              .single();

            if (profileError || !profile) {
              console.error(`  ❌ Profile not found for ${hrProfile.profile_id}`);
              results.errors.push(`Profile not found: ${hrProfile.profile_id}`);
              continue;
            }

            console.log(`  Found profile: ${profile.email}`);

            // 4. Vérifier si un candidate_profile existe déjà
            let { data: candidateProfile, error: candidateError } = await supabase
              .from('candidate_profiles')
              .select('*')
              .eq('email', profile.email)
              .single();

            // 5. Si pas de candidate_profile, en créer un
            if (!candidateProfile) {
              console.log(`  Creating new candidate_profile for ${profile.email}...`);
              
              const { data: newCandidate, error: createError } = await supabase
                .from('candidate_profiles')
                .insert({
                  email: profile.email,
                  profile_id: profile.id,
                  job_title: hrProfile.job_title || 'Consultant',
                  user_id: profile.id,
                  seniority: hrProfile.seniority || 'junior',
                  daily_rate: hrProfile.daily_rate || 500,
                  is_active: true
                })
                .select()
                .single();

              if (createError) {
                console.error(`  ❌ Error creating candidate_profile: ${createError.message}`);
                results.errors.push(`Failed to create candidate: ${createError.message}`);
                continue;
              }

              candidateProfile = newCandidate;
              results.created++;
              console.log(`  ✅ Created candidate_profile: ${candidateProfile.id}`);
            } else {
              console.log(`  Found existing candidate_profile: ${candidateProfile.id}`);
            }

            // 6. Mettre à jour l'assignation pour utiliser candidate_id
            const { error: updateError } = await supabase
              .from('hr_resource_assignments')
              .update({ 
                candidate_id: candidateProfile.id,
                // On garde profile_id pour l'instant au cas où
                // profile_id: null 
              })
              .eq('id', assignment.id);

            if (updateError) {
              console.error(`  ❌ Error updating assignment: ${updateError.message}`);
              results.errors.push(`Failed to update assignment: ${updateError.message}`);
            } else {
              results.migrated++;
              console.log(`  ✅ Updated assignment to use candidate_id: ${candidateProfile.id}`);
            }
          } else {
            console.log(`  ⚠️  hr_profile has no profile_id, skipping`);
            results.errors.push(`hr_profile ${hrProfile.id} has no profile_id`);
          }
        } catch (err) {
          console.error(`Error processing assignment ${assignment.id}:`, err);
          results.errors.push(`Assignment ${assignment.id}: ${err.message}`);
        }
      }
    }

    // 7. Optionnel : Supprimer la colonne profile_id si tout est migré
    const { data: remainingOld } = await supabase
      .from('hr_resource_assignments')
      .select('id')
      .not('profile_id', 'is', null)
      .is('candidate_id', null);

    if (!remainingOld || remainingOld.length === 0) {
      console.log('\n🎉 All assignments migrated! Safe to remove profile_id column.');
      
      // Décommenter pour supprimer la colonne
      // const { error: dropError } = await supabase.rpc('exec_sql', {
      //   sql_query: 'ALTER TABLE hr_resource_assignments DROP COLUMN IF EXISTS profile_id;'
      // });
      // if (!dropError) {
      //   console.log('✅ Removed profile_id column');
      // }
    } else {
      console.log(`\n⚠️  ${remainingOld.length} assignments still using profile_id`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});