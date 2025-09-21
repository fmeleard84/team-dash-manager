#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase avec service role key pour bypasser RLS
const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugAI() {
  console.log('🔍 Debug: AI Resources avec Service Key\n');
  console.log('='.repeat(60));

  try {
    // 1. Compter les projets
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total projets: ${projectCount}`);

    // 2. Récupérer quelques projets récents
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (projectError) {
      console.error('❌ Erreur projets:', projectError);
      return;
    }

    console.log(`\n📁 Projets récents:`);
    for (const p of projects || []) {
      console.log(`  - ${p.title} (${p.status}) - ${p.id}`);
    }

    // 3. Chercher spécifiquement des ressources IA
    console.log(`\n🤖 Recherche des ressources IA...`);

    const { data: iaProfiles, error: iaError } = await supabase
      .from('hr_profiles')
      .select('*')
      .eq('is_ai', true);

    if (iaError) {
      console.error('❌ Erreur hr_profiles:', iaError);
    } else {
      console.log(`✅ ${iaProfiles?.length || 0} profils IA trouvés`);
      for (const ia of iaProfiles || []) {
        console.log(`  - ${ia.name} (ID: ${ia.id})`);
      }
    }

    // 4. Chercher des assignments avec IA
    console.log(`\n🔗 Recherche des assignments IA...`);

    const { data: iaAssignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles!inner (
          id,
          name,
          is_ai
        ),
        projects!inner (
          title,
          status
        )
      `)
      .eq('hr_profiles.is_ai', true);

    if (assignError) {
      console.error('❌ Erreur assignments:', assignError);
    } else {
      console.log(`✅ ${iaAssignments?.length || 0} assignments IA trouvés`);
      for (const assign of iaAssignments || []) {
        console.log(`  - Projet: ${assign.projects.title} (${assign.projects.status})`);
        console.log(`    IA: ${assign.hr_profiles.name}`);
        console.log(`    Booking: ${assign.booking_status}`);
      }
    }

    // 5. Trouver un projet avec IA pour test
    if (iaAssignments && iaAssignments.length > 0) {
      const testProject = iaAssignments.find(a => a.projects.status === 'play') || iaAssignments[0];
      console.log(`\n✨ Projet test avec IA: ${testProject.projects.title}`);
      console.log(`   ID: ${testProject.project_id}`);
      console.log(`   Statut: ${testProject.projects.status}`);
      console.log(`   IA: ${testProject.hr_profiles.name}`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter
debugAI();