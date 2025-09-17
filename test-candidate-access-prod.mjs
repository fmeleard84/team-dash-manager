#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuration PRODUCTION
const PRODUCTION_URL = 'https://nlesrzepybeeghghjafc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

const supabase = createClient(PRODUCTION_URL, ANON_KEY);

console.log('🧪 Test d\'accès candidat en production');
console.log('========================================\n');

async function testCandidateAccess() {
  // ID du candidat depuis les logs
  const candidateId = '958fbe8e-01db-4d56-bb40-5d2d5ef74f95';

  console.log(`📍 Test pour le candidat: ${candidateId}\n`);

  // 1. Test requête simple hr_resource_assignments
  console.log('1. Test requête simple hr_resource_assignments...');
  try {
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .select('id, project_id, profile_id, booking_status')
      .limit(5);

    if (error) {
      console.error('❌ Erreur:', error.message);
      console.log('   Code:', error.code);
      console.log('   Détails:', error.details);
    } else {
      console.log('✅ Requête simple réussie');
      console.log('   Nombre d\'enregistrements:', data?.length || 0);
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }

  // 2. Test avec jointure projects
  console.log('\n2. Test requête avec jointure projects...');
  try {
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        profile_id,
        seniority,
        languages,
        expertises,
        calculated_price,
        booking_status,
        candidate_id,
        created_at,
        projects(id, title, description, owner_id, client_budget, project_date, due_date)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Erreur jointure:', error.message);
      console.log('   Code:', error.code);
      console.log('   Détails:', error.details);
      console.log('   Hint:', error.hint);
    } else {
      console.log('✅ Requête avec jointure réussie');
      console.log('   Données récupérées:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('   Premier élément:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }

  // 3. Test accès au profil candidat
  console.log('\n3. Test accès au profil candidat...');
  try {
    const { data: profile, error: profileError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (profileError) {
      console.error('❌ Erreur profil:', profileError.message);
    } else if (profile) {
      console.log('✅ Profil candidat trouvé:');
      console.log(`   Nom: ${profile.first_name} ${profile.last_name}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Status: ${profile.status}`);
      console.log(`   Métier: ${profile.profile_id || 'Non défini'}`);
    } else {
      console.log('⚠️ Aucun profil trouvé pour ce candidat');
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }

  // 4. Test des tables HR
  console.log('\n4. Vérification des tables HR...');

  // Test hr_categories
  try {
    const { data: categories, error: catError } = await supabase
      .from('hr_categories')
      .select('name')
      .limit(3);

    if (catError) {
      console.error('❌ hr_categories non accessible:', catError.message);
    } else {
      console.log('✅ hr_categories:', categories?.map(c => c.name).join(', '));
    }
  } catch (err) {
    console.error('❌ Exception hr_categories:', err);
  }

  // Test hr_profiles
  try {
    const { data: profiles, error: profError } = await supabase
      .from('hr_profiles')
      .select('name, base_price')
      .limit(3);

    if (profError) {
      console.error('❌ hr_profiles non accessible:', profError.message);
    } else {
      console.log('✅ hr_profiles:', profiles?.map(p => `${p.name} (${p.base_price}€)`).join(', '));
    }
  } catch (err) {
    console.error('❌ Exception hr_profiles:', err);
  }

  // 5. Test spécifique pour le candidat
  console.log('\n5. Test requête spécifique candidat...');
  try {
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .or(`candidate_id.eq.${candidateId},candidate_id.is.null,booking_status.eq.recherche`);

    if (error) {
      console.error('❌ Erreur requête candidat:', error.message);
    } else {
      console.log('✅ Requête candidat réussie');
      console.log('   Missions disponibles:', data?.length || 0);
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }

  console.log('\n✅ Tests terminés');
}

testCandidateAccess().catch(console.error);