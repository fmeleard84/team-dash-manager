import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeClientAndProjects() {
  console.log('=== ANALYSE CLIENT ET PROJETS ===\n');

  // 1. Trouver le client (avec les deux orthographes possibles)
  const emails = ['fmeleard+clienr_1119@gmail.com', 'fmeleard+client_1119@gmail.com'];
  
  for (const email of emails) {
    console.log(`\nRecherche client avec email: ${email}`);
    
    // Chercher dans profiles (structure ID universel)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profile) {
      console.log('\n✅ CLIENT TROUVÉ dans profiles:');
      console.log('- ID:', profile.id);
      console.log('- Email:', profile.email);
      console.log('- Role:', profile.role);
      console.log('- Nom:', profile.first_name, profile.last_name);
      
      // Chercher dans client_profiles
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
        
      if (clientProfile) {
        console.log('\n✅ PROFIL CLIENT trouvé:');
        console.log('- ID:', clientProfile.id);
        console.log('- Old ID:', clientProfile.old_id);
        console.log('- Company:', clientProfile.company_name);
      }

      // 2. Chercher les projets avec owner_id
      console.log('\n=== RECHERCHE PROJETS (owner_id = profile.id) ===');
      const { data: projectsByOwner, error: ownerError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', profile.id);

      if (projectsByOwner && projectsByOwner.length > 0) {
        console.log(`\n✅ ${projectsByOwner.length} projet(s) trouvé(s) avec owner_id:`, profile.id);
        projectsByOwner.forEach(p => {
          console.log(`\nProjet: ${p.title}`);
          console.log('- ID:', p.id);
          console.log('- Status:', p.status);
          console.log('- Date:', p.project_date);
          console.log('- Owner ID:', p.owner_id);
        });
      } else {
        console.log('❌ Aucun projet avec owner_id:', profile.id);
      }

      // 3. Chercher avec l'ancien ID si présent
      if (clientProfile?.old_id) {
        console.log('\n=== RECHERCHE PROJETS (owner_id = old_id) ===');
        const { data: projectsByOldId } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', clientProfile.old_id);

        if (projectsByOldId && projectsByOldId.length > 0) {
          console.log(`\n⚠️ ${projectsByOldId.length} projet(s) trouvé(s) avec ANCIEN ID:`, clientProfile.old_id);
          projectsByOldId.forEach(p => {
            console.log(`\nProjet: ${p.title}`);
            console.log('- ID:', p.id);
            console.log('- Status:', p.status);
            console.log('- Owner ID (ancien):', p.owner_id);
          });
        }
      }

      // 4. Chercher avec user_id (ancienne structure)
      console.log('\n=== RECHERCHE PROJETS (user_id) ===');
      const { data: projectsByUserId } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', profile.id);

      if (projectsByUserId && projectsByUserId.length > 0) {
        console.log(`\n✅ ${projectsByUserId.length} projet(s) trouvé(s) avec user_id:`, profile.id);
        projectsByUserId.forEach(p => {
          console.log(`\nProjet: ${p.title}`);
          console.log('- ID:', p.id);
          console.log('- Status:', p.status);
          console.log('- User ID:', p.user_id);
        });
      }
    }
  }

  // 5. Chercher TOUS les projets pour comprendre
  console.log('\n\n=== TOUS LES PROJETS DANS LA BASE ===');
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, title, status, owner_id, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (allProjects && allProjects.length > 0) {
    console.log(`Total: ${allProjects.length} projets récents`);
    allProjects.forEach(p => {
      console.log(`\n- ${p.title || 'Sans titre'}`);
      console.log('  ID:', p.id);
      console.log('  Status:', p.status);
      console.log('  Owner ID:', p.owner_id || 'null');
      console.log('  User ID:', p.user_id || 'null');
    });
  } else {
    console.log('❌ Aucun projet dans la base');
  }

  process.exit(0);
}

analyzeClientAndProjects().catch(console.error);