// Test direct depuis l'application avec les mêmes clés
import { createClient } from '@supabase/supabase-js';

// Utiliser EXACTEMENT les mêmes clés que l'application
const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFromApp() {
  console.log('🔍 Test avec les MÊMES clés que l\'application...\n');
  console.log('URL:', SUPABASE_URL);
  console.log('KEY (début):', SUPABASE_ANON_KEY.substring(0, 50) + '...\n');

  // 1. Test de connexion
  const { data: testData, error: testError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (testError) {
    console.log('❌ ERREUR de connexion:', testError);
    return;
  }

  console.log('✅ Connexion OK\n');

  // 2. Chercher l'utilisateur candidat
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'fmeleard+cdp_2@gmail.com')
    .single();

  if (userError) {
    console.log('❌ Utilisateur non trouvé:', userError);
  } else {
    console.log('✅ Utilisateur trouvé:', user.email, '- ID:', user.id);
  }

  // 3. Compter les projets
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 Nombre total de projets:', projectCount || 0);

  // 4. Chercher les projets récents
  const { data: recentProjects, error: projectError } = await supabase
    .from('projects')
    .select('id, title, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (projectError) {
    console.log('❌ Erreur requête projets:', projectError);
  } else if (recentProjects && recentProjects.length > 0) {
    console.log('\n📁 Projets récents:');
    recentProjects.forEach(p => {
      console.log(`  - "${p.title}" (status: ${p.status})`);
    });
  } else {
    console.log('\n⚠️ Aucun projet trouvé');
  }

  // 5. Compter les assignments
  const { count: assignmentCount } = await supabase
    .from('hr_resource_assignments')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 Nombre total d\'assignments:', assignmentCount || 0);

  // 6. Test avec service key
  const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

  const supabaseService = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
  });

  console.log('\n🔑 Test avec SERVICE KEY (contourne RLS):');

  const { count: serviceProjectCount } = await supabaseService
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log('  Projets visibles avec service key:', serviceProjectCount || 0);
}

testFromApp().catch(console.error);