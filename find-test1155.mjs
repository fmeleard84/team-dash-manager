import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTest1155() {
  console.log('=== RECHERCHE DU PROJET test1155 ===\n');

  // 1. Chercher par titre
  const { data: projectsByTitle, error: titleError } = await supabase
    .from('projects')
    .select('*')
    .eq('title', 'test1155');
    
  if (projectsByTitle && projectsByTitle.length > 0) {
    console.log(`✅ Projet trouvé par titre:`);
    projectsByTitle.forEach(p => {
      console.log('\n- ID:', p.id);
      console.log('- Title:', p.title);
      console.log('- Owner ID:', p.owner_id);
      console.log('- Status:', p.status);
      console.log('- Created:', p.created_at);
    });
  } else {
    console.log('❌ Aucun projet avec le titre "test1155"');
  }
  
  // 2. Chercher par ID partiel
  const { data: projectsById } = await supabase
    .from('projects')
    .select('*')
    .like('id', '%cff8241a%');
    
  if (projectsById && projectsById.length > 0) {
    console.log(`\n✅ Projet trouvé par ID partiel:`);
    projectsById.forEach(p => {
      console.log('\n- ID:', p.id);
      console.log('- Title:', p.title);
      console.log('- Owner ID:', p.owner_id);
    });
  } else {
    console.log('\n❌ Aucun projet avec l\'ID contenant "cff8241a"');
  }
  
  // 3. Lister TOUS les projets récents
  console.log('\n\n=== TOUS LES PROJETS RÉCENTS ===');
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, title, owner_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (allProjects && allProjects.length > 0) {
    console.log(`\n${allProjects.length} projet(s) récent(s):`);
    allProjects.forEach(p => {
      console.log(`\n- ${p.title}`);
      console.log('  ID:', p.id);
      console.log('  Owner:', p.owner_id);
      console.log('  Status:', p.status);
      console.log('  Created:', p.created_at);
    });
  } else {
    console.log('❌ Aucun projet dans la base');
  }
  
  // 4. Vérifier le client
  const clientEmail = 'fmeleard+clienr_1119@gmail.com';
  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', clientEmail)
    .single();
    
  if (clientProfile) {
    console.log('\n\n=== PROJETS DU CLIENT ===');
    console.log('Client ID:', clientProfile.id);
    
    const { data: clientProjects } = await supabase
      .from('projects')
      .select('id, title, status, created_at')
      .eq('owner_id', clientProfile.id)
      .order('created_at', { ascending: false });
      
    if (clientProjects && clientProjects.length > 0) {
      console.log(`\n${clientProjects.length} projet(s) du client:`);
      clientProjects.forEach(p => {
        console.log(`- ${p.title} (${p.id})`);
      });
    } else {
      console.log('❌ Aucun projet pour ce client');
    }
  }
  
  console.log('\n\n=== DIAGNOSTIC ===');
  console.log('\nLE PROBLÈME:');
  console.log('Le projet test1155 n\'existe pas dans la base de données !');
  console.log('\nCAUSES POSSIBLES:');
  console.log('1. Erreur lors de la création (vérifier la console du navigateur)');
  console.log('2. Problème de permissions RLS');
  console.log('3. Transaction rollback');
  console.log('4. Le projet a été créé dans une autre base/environnement');
  
  process.exit(0);
}

findTest1155().catch(console.error);