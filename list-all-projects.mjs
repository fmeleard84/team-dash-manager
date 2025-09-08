import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listProjects() {
  console.log('=== LISTE DE TOUS LES PROJETS ===\n');

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, status, owner_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.log(`Total: ${projects.length} projets\n`);
  
  projects.forEach(p => {
    console.log(`- ${p.title}`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Owner: ${p.owner_id}`);
    console.log(`  Créé: ${p.created_at}`);
    console.log('');
  });

  // Chercher spécifiquement test1126
  const test = projects.find(p => p.title?.includes('test1126'));
  if (test) {
    console.log('PROJET TEST1126 TROUVÉ:', test);
  } else {
    console.log('⚠️ PROJET TEST1126 NON TROUVÉ');
  }

  process.exit(0);
}

listProjects().catch(console.error);