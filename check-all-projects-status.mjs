import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Vérification de tous les projets ===\n');

// Chercher TOUS les projets
const { data: projects, error } = await supabase
  .from('projects')
  .select('id, title, status, owner_id, created_at')
  .order('created_at', { ascending: false })
  .limit(20);

if (error) {
  console.error('Erreur:', error);
  process.exit(1);
}

console.log(`Total projets trouvés: ${projects?.length || 0}\n`);

if (projects && projects.length > 0) {
  // Grouper par statut
  const byStatus = {};
  projects.forEach(p => {
    if (!byStatus[p.status]) byStatus[p.status] = [];
    byStatus[p.status].push(p);
  });
  
  console.log('Par statut:');
  Object.keys(byStatus).forEach(status => {
    console.log(`\n${status}: ${byStatus[status].length} projets`);
    byStatus[status].slice(0, 3).forEach(p => {
      console.log(`  - ${p.title} (ID: ${p.id})`);
    });
  });
  
  // Chercher un projet avec équipe
  console.log('\n\n=== Recherche projet avec équipe ===');
  
  for (const project of projects) {
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select('candidate_id, booking_status')
      .eq('project_id', project.id);
    
    if (assignments && assignments.length > 0) {
      const accepted = assignments.filter(a => a.booking_status === 'accepted').length;
      console.log(`\n✅ "${project.title}" (status: ${project.status})`);
      console.log(`   - ${assignments.length} ressources assignées`);
      console.log(`   - ${accepted} acceptées`);
      
      if (accepted > 0) {
        console.log('\n🎯 Ce projet peut être utilisé pour les tests !');
        console.log(`   ID: ${project.id}`);
        break;
      }
    }
  }
}

process.exit(0);