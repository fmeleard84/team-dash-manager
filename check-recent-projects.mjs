import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentProjects() {
  console.log('=== PROJETS RÉCENTS (dernières 24h) ===\n');
  
  // 1. Chercher les projets récents
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false });
    
  if (error) {
    console.log('❌ Erreur:', error);
    process.exit(1);
  }
  
  if (!projects || projects.length === 0) {
    console.log('❌ Aucun projet créé dans les dernières 24h');
    
    // Chercher les 5 derniers projets
    console.log('\n=== 5 DERNIERS PROJETS (tous) ===\n');
    const { data: allProjects } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (allProjects && allProjects.length > 0) {
      allProjects.forEach((p, i) => {
        console.log(`${i+1}. Projet: ${p.title}`);
        console.log(`   - ID: ${p.id}`);
        console.log(`   - Owner ID: ${p.owner_id}`);
        console.log(`   - Status: ${p.status}`);
        console.log(`   - Created: ${p.created_at}`);
        console.log('');
      });
    }
  } else {
    console.log(`✅ ${projects.length} projet(s) récent(s) trouvé(s):\n`);
    projects.forEach((p, i) => {
      console.log(`${i+1}. Projet: ${p.title}`);
      console.log(`   - ID: ${p.id}`);
      console.log(`   - Owner ID: ${p.owner_id}`);
      console.log(`   - Status: ${p.status}`);
      console.log(`   - Created: ${p.created_at}`);
      
      // Vérifier les assignations
      console.log('   - Vérification des assignations...');
    });
    
    // Pour chaque projet, vérifier les assignations
    console.log('\n=== DÉTAIL DES ASSIGNATIONS ===\n');
    for (const project of projects) {
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('project_id', project.id);
        
      console.log(`Projet "${project.title}" (${project.id}):`);
      if (assignments && assignments.length > 0) {
        console.log(`  ✅ ${assignments.length} assignation(s)`);
        assignments.forEach(a => {
          console.log(`    - Profile: ${a.profile_id}, Seniority: ${a.seniority}, Status: ${a.booking_status}`);
        });
      } else {
        console.log(`  ❌ Aucune assignation`);
      }
      console.log('');
    }
  }
  
  // Vérifier le client
  const clientEmail = 'fmeleard+clienr_1119@gmail.com';
  console.log(`\n=== VÉRIFICATION CLIENT ${clientEmail} ===\n`);
  
  const { data: clientProfile } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('email', clientEmail)
    .single();
    
  if (clientProfile) {
    console.log('✅ Client trouvé:');
    console.log('   - ID universel:', clientProfile.id);
    console.log('   - Company:', clientProfile.company_name);
    
    // Projets de ce client
    const { data: clientProjects } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', clientProfile.id)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (clientProjects && clientProjects.length > 0) {
      console.log(`\n   Projets de ce client (${clientProjects.length}):`);
      clientProjects.forEach(p => {
        console.log(`   - ${p.title} (${p.status}) - ${p.created_at}`);
      });
    }
  } else {
    console.log('❌ Client non trouvé');
  }
  
  process.exit(0);
}

checkRecentProjects().catch(console.error);