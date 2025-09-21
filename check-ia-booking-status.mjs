#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkProjectIA() {
  const projectId = '5ec653f5-5de9-4291-a2d9-e301425adbad';

  console.log('🔍 Vérification du projet:', projectId);
  console.log('='.repeat(60));

  try {
    // Récupérer TOUS les assignments du projet (sans filtre booking_status)
    const { data: allAssignments, error } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (
          name,
          is_ai,
          prompt_id
        ),
        candidate_profiles (
          first_name,
          last_name,
          email
        )
      `)
      .eq('project_id', projectId);

    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }

    console.log(`\n📊 Total assignments dans ce projet: ${allAssignments?.length || 0}`);

    if (allAssignments && allAssignments.length > 0) {
      console.log('\n📋 Détails de chaque assignment:');

      for (const assign of allAssignments) {
        const isAI = assign.hr_profiles?.is_ai || false;
        const name = isAI
          ? assign.hr_profiles?.name
          : assign.candidate_profiles?.first_name || 'Inconnu';

        console.log(`\n${isAI ? '🤖' : '👤'} ${name}${isAI ? ' (IA)' : ''}`);
        console.log(`   - Assignment ID: ${assign.id}`);
        console.log(`   - Profile ID: ${assign.profile_id}`);
        console.log(`   - Candidate ID: ${assign.candidate_id || 'NULL'}`);
        console.log(`   - Booking Status: ${assign.booking_status} ${assign.booking_status !== 'accepted' ? '⚠️' : '✅'}`);
        console.log(`   - hr_profiles.is_ai: ${assign.hr_profiles?.is_ai}`);

        if (!isAI && !assign.candidate_id) {
          console.log('   ⚠️ ATTENTION: Pas d\'IA mais pas de candidate_id non plus!');
        }
      }

      // Vérifier spécifiquement les assignments avec is_ai = true
      const iaAssignments = allAssignments.filter(a => a.hr_profiles?.is_ai === true);
      const acceptedIA = iaAssignments.filter(a => a.booking_status === 'accepted');

      console.log('\n📊 Résumé:');
      console.log(`   - Total IA dans le projet: ${iaAssignments.length}`);
      console.log(`   - IA avec status "accepted": ${acceptedIA.length}`);

      if (iaAssignments.length > 0 && acceptedIA.length === 0) {
        console.log('\n⚠️ PROBLÈME IDENTIFIÉ:');
        console.log('Les IA existent mais n\'ont pas booking_status = "accepted"');
        console.log('C\'est pourquoi elles n\'apparaissent pas côté candidat!');
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkProjectIA();