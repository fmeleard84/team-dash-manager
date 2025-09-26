#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugIAProfiles() {
  console.log('🔍 [DEBUG] Diagnostic des profils IA...\n');

  try {
    // 1. Récupérer tous les hr_profiles avec is_ai = true
    const { data: hrProfiles, error: hrError } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai, prompt_id')
      .eq('is_ai', true);

    if (hrError) {
      console.error('❌ Erreur hr_profiles:', hrError);
      return;
    }

    console.log('🤖 Profils IA dans hr_profiles:');
    console.table(hrProfiles);

    // 2. Pour chaque IA, vérifier si elle a un candidate_profile correspondant
    for (const hrProfile of hrProfiles || []) {
      console.log(`\n🔍 Vérification IA "${hrProfile.name}" (ID: ${hrProfile.id}):`);

      const { data: candidateProfile, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('id, email, first_name, last_name')
        .eq('id', hrProfile.id)
        .maybeSingle();

      if (candidateError) {
        console.error('  ❌ Erreur candidate_profile:', candidateError);
      } else if (candidateProfile) {
        console.log('  ✅ Profil candidat trouvé:', candidateProfile);
      } else {
        console.log('  ❌ AUCUN profil candidat trouvé !');
      }

      // 3. Vérifier les assignments
      const { data: assignments, error: assignError } = await supabase
        .from('hr_resource_assignments')
        .select('id, project_id, candidate_id, booking_status')
        .eq('profile_id', hrProfile.id);

      if (assignError) {
        console.error('  ❌ Erreur assignments:', assignError);
      } else if (assignments && assignments.length > 0) {
        console.log(`  📋 ${assignments.length} assignment(s) trouvé(s):`, assignments);
      } else {
        console.log('  📋 Aucun assignment trouvé');
      }
    }

    // 4. Vérifier dans le projet TEST3
    console.log('\n🎯 Vérification spécifique projet TEST3:');
    const { data: test3Projects, error: projectError } = await supabase
      .from('projects')
      .select('id, title')
      .ilike('title', '%TEST3%');

    if (projectError) {
      console.error('❌ Erreur projets:', projectError);
    } else if (test3Projects && test3Projects.length > 0) {
      const projectId = test3Projects[0].id;
      console.log(`📂 Projet trouvé: ${test3Projects[0].title} (${projectId})`);

      const { data: projectAssignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id, profile_id, candidate_id, booking_status,
          hr_profiles (id, name, is_ai),
          candidate_profiles (id, first_name, last_name, email)
        `)
        .eq('project_id', projectId);

      console.log('👥 Équipe du projet TEST3:');
      console.table(projectAssignments);
    }

  } catch (error) {
    console.error('💥 Erreur générale:', error);
  }
}

debugIAProfiles();