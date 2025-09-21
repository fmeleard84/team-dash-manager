#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
// Utilisons la clé service_role pour bypasser RLS
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function checkWithServiceKey() {
  console.log('🔐 Vérification avec Service Key (bypass RLS)\n');

  try {
    // 1. Compter les projets
    const { count: projectCount, error: projectError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    if (projectError) {
      console.error('❌ Erreur projets:', projectError);
      return;
    }

    console.log(`📊 Total projets (sans RLS): ${projectCount}`);

    // 2. Lister quelques projets
    const { data: projects, error: listError } = await supabase
      .from('projects')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (listError) {
      console.error('❌ Erreur liste:', listError);
      return;
    }

    if (projects && projects.length > 0) {
      console.log('\n📁 Projets existants:');
      for (const p of projects) {
        console.log(`  - ${p.title} (${p.status}) - ${p.id}`);

        // Vérifier les assignments IA pour ce projet
        const { data: iaAssign } = await supabase
          .from('hr_resource_assignments')
          .select(`
            *,
            hr_profiles!inner (
              name,
              is_ai
            )
          `)
          .eq('project_id', p.id)
          .eq('hr_profiles.is_ai', true);

        if (iaAssign && iaAssign.length > 0) {
          console.log(`    🤖 ${iaAssign.length} IA assignée(s)`);
          for (const ia of iaAssign) {
            console.log(`       - ${ia.hr_profiles.name} (booking: ${ia.booking_status})`);
          }
        }
      }
    } else {
      console.log('⚠️ Aucun projet trouvé même sans RLS');
    }

    // 3. Vérifier les profils IA
    const { data: iaProfiles } = await supabase
      .from('hr_profiles')
      .select('id, name')
      .eq('is_ai', true);

    console.log(`\n🤖 Profils IA disponibles: ${iaProfiles?.length || 0}`);
    if (iaProfiles) {
      for (const ia of iaProfiles) {
        console.log(`  - ${ia.name} (${ia.id})`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkWithServiceKey();