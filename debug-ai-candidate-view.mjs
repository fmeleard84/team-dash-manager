#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugAICandidateView() {
  console.log('🔍 Debug: AI Resources in Candidate View\n');
  console.log('='.repeat(60));

  try {
    // 1. Trouver un projet avec statut = 'play' et des ressources IA
    console.log('\n1️⃣ Recherche d\'un projet actif avec IA...');

    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        status,
        owner_id
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (projectError) {
      console.error('❌ Erreur lors de la récupération des projets:', projectError);
      return;
    }

    console.log(`✅ ${projects?.length || 0} projets trouvés (tous statuts)`);

    // Pour chaque projet, vérifier les ressources
    for (const project of projects || []) {
      console.log(`\n📁 Projet: ${project.title} (${project.id})`);

      // 2. Récupérer les assignments de ce projet
      const { data: assignments, error: assignError } = await supabase
        .from('hr_resource_assignments')
        .select(`
          *,
          hr_profiles!inner (
            id,
            name,
            is_ai,
            prompt_id
          ),
          candidate_profiles (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('project_id', project.id)
        .in('booking_status', ['accepted', 'completed']);

      if (assignError) {
        console.error(`❌ Erreur assignments:`, assignError);
        continue;
      }

      console.log(`  📊 Ressources totales: ${assignments?.length || 0}`);

      // Séparer les ressources humaines et IA
      const aiResources = assignments?.filter(a => a.hr_profiles?.is_ai) || [];
      const humanResources = assignments?.filter(a => !a.hr_profiles?.is_ai) || [];

      console.log(`  👤 Ressources humaines: ${humanResources.length}`);
      console.log(`  🤖 Ressources IA: ${aiResources.length}`);

      if (aiResources.length > 0) {
        console.log('\n  🤖 Détails des ressources IA:');
        for (const ai of aiResources) {
          console.log(`    - ${ai.hr_profiles.name}`);
          console.log(`      Profile ID: ${ai.profile_id}`);
          console.log(`      Candidate ID: ${ai.candidate_id}`);
          console.log(`      Prompt ID: ${ai.hr_profiles.prompt_id || 'Aucun'}`);
          console.log(`      Booking Status: ${ai.booking_status}`);

          // Vérifier si le profil candidat existe
          if (ai.candidate_id) {
            const { data: candidateProfile, error: candidateError } = await supabase
              .from('candidate_profiles')
              .select('id, first_name, last_name, email')
              .eq('id', ai.candidate_id)
              .single();

            if (candidateProfile) {
              console.log(`      ✅ Profil candidat trouvé: ${candidateProfile.email}`);
            } else {
              console.log(`      ⚠️ Profil candidat inexistant pour ID: ${ai.candidate_id}`);
            }
          } else {
            console.log(`      ⚠️ Pas de candidate_id défini`);
          }
        }
      }

      if (humanResources.length > 0) {
        console.log('\n  👤 Détails des ressources humaines:');
        for (const human of humanResources) {
          const name = human.candidate_profiles?.first_name || 'Sans nom';
          console.log(`    - ${name} (${human.hr_profiles?.name || 'Métier inconnu'})`);
          console.log(`      Candidate ID: ${human.candidate_id}`);
          console.log(`      Email: ${human.candidate_profiles?.email || 'N/A'}`);
        }
      }

      // 3. Simuler ce que verrait le hook useProjectMembersForMessaging
      console.log('\n  🔄 Simulation du hook useProjectMembersForMessaging:');

      const simulatedMembers = [];

      // Ajouter le client
      if (project.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', project.owner_id)
          .single();

        if (ownerProfile) {
          simulatedMembers.push({
            id: ownerProfile.id,
            name: ownerProfile.first_name || 'Client',
            role: 'client'
          });
        }
      }

      // Ajouter les ressources
      for (const assignment of assignments || []) {
        if (assignment.hr_profiles?.is_ai) {
          // Ressource IA
          simulatedMembers.push({
            id: `ia_${assignment.profile_id}`,
            name: `${assignment.hr_profiles.name} (IA)`,
            role: 'ia',
            isAI: true
          });
        } else if (assignment.candidate_id) {
          // Ressource humaine
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', assignment.candidate_id)
            .single();

          if (profile) {
            simulatedMembers.push({
              id: profile.id,
              name: profile.first_name || 'Candidat',
              role: 'candidate',
              isAI: false
            });
          }
        }
      }

      console.log(`  📋 Membres simulés: ${simulatedMembers.length}`);
      for (const member of simulatedMembers) {
        console.log(`    - ${member.name} (${member.role})${member.isAI ? ' 🤖' : ''}`);
      }

      // Si on trouve un projet avec IA, on s'arrête
      if (aiResources.length > 0) {
        console.log('\n✨ Projet avec IA trouvé! ID:', project.id);
        break;
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le debug
debugAICandidateView();