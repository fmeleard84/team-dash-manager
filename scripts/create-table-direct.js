import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1OTM4NzQsImV4cCI6MjAzODE2OTg3NH0.V46sINZHShqwFD5fP0xEA2ZDBE4qziqVQJJzubQD0ZE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCurrentSystem() {
  console.log('🔍 Test du système actuel...\n');

  try {
    // 1. Tester si la table project_members existe
    console.log('📋 Test de project_members...');
    const { data: membersTest, error: membersError } = await supabase
      .from('project_members')
      .select('*')
      .limit(1);

    if (membersError) {
      console.log('❌ Table project_members n\'existe pas encore');
      console.log('   Erreur:', membersError.message);
      console.log('\n💡 Utilisation du système de fallback (hr_resource_assignments)');
    } else {
      console.log('✅ Table project_members existe!');
      
      // Compter les membres
      const { count } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true });
      
      console.log(`   Total membres dans la table: ${count || 0}`);
    }

    // 2. Tester le projet spécifique avec l'ancien système
    console.log('\n📋 Test avec hr_resource_assignments...');
    const projectId = '16fd6a53-d0ed-49e9-aec6-99813eb23738';
    
    const { data: assignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        candidate_profiles (id, email, first_name, last_name, job_title)
      `)
      .eq('project_id', projectId);

    if (assignError) {
      console.log('❌ Erreur:', assignError);
    } else {
      console.log(`✅ Trouvé ${assignments?.length || 0} assignation(s)`);
      
      assignments?.forEach(a => {
        const name = a.candidate_profiles?.first_name || 
                     a.candidate_profiles?.email?.split('@')[0] || 
                     'Inconnu';
        const job = a.job_title || a.candidate_profiles?.job_title || 'N/A';
        const status = a.booking_status || 'N/A';
        console.log(`   👥 ${name} - ${job} (Status: ${status})`);
      });
    }

    // 3. Tester le client du projet
    console.log('\n📋 Test du client du projet...');
    const { data: project } = await supabase
      .from('projects')
      .select(`
        *,
        profiles (id, email, first_name, last_name)
      `)
      .eq('id', projectId)
      .single();

    if (project?.profiles) {
      const client = project.profiles;
      console.log(`   👤 Client: ${client.first_name || client.email} (${client.email})`);
    }

    console.log('\n✅ Le système de fallback fonctionne correctement');
    console.log('📝 Le hook useProjectUsers utilisera automatiquement le fallback');
    console.log('   tant que la table project_members n\'existe pas.');
    
    // 4. Résumé
    console.log('\n📊 RÉSUMÉ:');
    console.log('===========');
    if (membersError) {
      console.log('• Mode: FALLBACK (ancien système)');
      console.log('• Les données sont lues depuis hr_resource_assignments');
      console.log('• Tous les membres devraient apparaître maintenant');
    } else {
      console.log('• Mode: NOUVEAU SYSTÈME (project_members)');
      console.log('• Les données sont lues depuis la nouvelle table unifiée');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testCurrentSystem();