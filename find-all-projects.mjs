import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAllProjects() {
  console.log('=== RECHERCHE DE TOUS LES PROJETS AVEC TOUT OWNER_ID ===\n');

  // Récupérer TOUS les projets sans filtre
  const { data: allProjects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  if (allProjects && allProjects.length > 0) {
    console.log(`✅ ${allProjects.length} projet(s) trouvé(s):\n`);
    
    allProjects.forEach(p => {
      console.log(`Projet: ${p.title}`);
      console.log('- ID:', p.id);
      console.log('- Owner ID:', p.owner_id);
      console.log('- User ID:', p.user_id);
      console.log('- Status:', p.status);
      console.log('- Date:', p.project_date);
      console.log('- Créé le:', p.created_at);
      console.log('');
    });
    
    // Analyser les owner_id uniques
    const ownerIds = [...new Set(allProjects.map(p => p.owner_id).filter(Boolean))];
    const userIds = [...new Set(allProjects.map(p => p.user_id).filter(Boolean))];
    
    console.log('\n=== ANALYSE DES PROPRIÉTAIRES ===');
    console.log('Owner IDs uniques:', ownerIds);
    console.log('User IDs uniques:', userIds);
    
    // Pour chaque owner_id, essayer de trouver le profil correspondant
    for (const ownerId of ownerIds) {
      console.log(`\nRecherche du profil pour owner_id: ${ownerId}`);
      
      // Chercher dans profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', ownerId)
        .single();
        
      if (profile) {
        console.log('✅ Trouvé dans profiles:', profile.email, '(role:', profile.role + ')');
      } else {
        console.log('❌ Non trouvé dans profiles avec cet ID');
        
        // Chercher dans client_profiles avec old_id
        const { data: clientWithOldId } = await supabase
          .from('client_profiles')
          .select('id, email, old_id')
          .eq('old_id', ownerId)
          .single();
          
        if (clientWithOldId) {
          console.log('⚠️ TROUVÉ comme old_id dans client_profiles!');
          console.log('  Email:', clientWithOldId.email);
          console.log('  Nouvel ID:', clientWithOldId.id);
          console.log('  --> Les projets doivent être migrés vers le nouvel ID');
        }
      }
    }
  } else {
    console.log('❌ Aucun projet dans la base de données');
    
    // Vérifier si c'est un problème de permissions RLS
    console.log('\nVérification des permissions RLS...');
    console.log('Les projets peuvent exister mais être invisibles à cause des RLS.');
    console.log('Pour voir tous les projets, il faut:');
    console.log('1. Se connecter avec le compte client propriétaire');
    console.log('2. Ou utiliser une clé service_role (côté serveur uniquement)');
  }
  
  process.exit(0);
}

findAllProjects().catch(console.error);