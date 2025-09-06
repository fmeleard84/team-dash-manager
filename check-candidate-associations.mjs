import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCandidateAssociations() {
  console.log('\n=== ANALYSE DES ASSOCIATIONS CANDIDATS ===\n');

  try {
    // 1. Vérifier la structure de candidate_profiles
    console.log('1. Vérification de la structure candidate_profiles:');
    const { data: profiles, error: profilesError } = await supabase
      .from('candidate_profiles')
      .select('id, profile_id, email, seniority, status')
      .limit(5);
    
    if (profilesError) {
      console.error('Erreur profiles:', profilesError);
    } else {
      console.log('Exemple de profils candidats:');
      profiles.forEach(p => {
        console.log(`  - ID: ${p.id}, Profile_ID: ${p.profile_id}, Email: ${p.email}`);
      });
    }

    // 2. Vérifier les associations de langues
    console.log('\n2. Vérification des associations candidate_languages:');
    const { data: langAssoc, error: langError } = await supabase
      .from('candidate_languages')
      .select('id, candidate_id')
      .limit(5);
    
    if (langError) {
      console.error('Erreur langues:', langError);
    } else {
      console.log(`Nombre d'associations trouvées: ${langAssoc?.length || 0}`);
      if (langAssoc && langAssoc.length > 0) {
        console.log('Exemples de candidate_id dans candidate_languages:');
        langAssoc.forEach(l => {
          console.log(`  - ${l.candidate_id}`);
        });
      }
    }

    // 3. Vérifier les associations d'expertises
    console.log('\n3. Vérification des associations candidate_expertises:');
    const { data: expAssoc, error: expError } = await supabase
      .from('candidate_expertises')
      .select('id, candidate_id')
      .limit(5);
    
    if (expError) {
      console.error('Erreur expertises:', expError);
    } else {
      console.log(`Nombre d'associations trouvées: ${expAssoc?.length || 0}`);
      if (expAssoc && expAssoc.length > 0) {
        console.log('Exemples de candidate_id dans candidate_expertises:');
        expAssoc.forEach(e => {
          console.log(`  - ${e.candidate_id}`);
        });
      }
    }

    // 4. Vérifier la correspondance des IDs
    console.log('\n4. Analyse des correspondances:');
    
    // Récupérer un candidat avec son auth.uid
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const candidateUser = authUsers?.users?.find(u => 
      u.user_metadata?.role === 'candidate' || 
      u.email?.includes('candidate')
    );

    if (candidateUser) {
      console.log(`\nTest avec candidat ${candidateUser.email}:`);
      console.log(`  - auth.uid: ${candidateUser.id}`);
      
      // Vérifier le profil
      const { data: profile } = await supabase
        .from('candidate_profiles')
        .select('id, profile_id')
        .eq('id', candidateUser.id)
        .single();
      
      if (profile) {
        console.log(`  - candidate_profiles.id: ${profile.id}`);
        console.log(`  - candidate_profiles.profile_id: ${profile.profile_id}`);
        
        // Vérifier les langues avec l'ancien ID
        const { data: oldLangs } = await supabase
          .from('candidate_languages')
          .select('id')
          .eq('candidate_id', profile.profile_id);
        
        console.log(`  - Langues avec ancien ID (profile_id): ${oldLangs?.length || 0}`);
        
        // Vérifier les langues avec le nouvel ID
        const { data: newLangs } = await supabase
          .from('candidate_languages')
          .select('id')
          .eq('candidate_id', candidateUser.id);
        
        console.log(`  - Langues avec nouvel ID (auth.uid): ${newLangs?.length || 0}`);
      }
    }

    // 5. Diagnostic
    console.log('\n=== DIAGNOSTIC ===\n');
    console.log('PROBLÈME IDENTIFIÉ:');
    console.log('Les tables candidate_languages et candidate_expertises utilisent');
    console.log('toujours l\'ancien candidate_id (profile_id) au lieu du nouvel');
    console.log('ID universel (auth.uid).');
    console.log('\nSOLUTION REQUISE:');
    console.log('Migration des foreign keys dans candidate_languages et candidate_expertises');
    console.log('pour utiliser le nouvel ID universel.');

  } catch (error) {
    console.error('Erreur:', error);
  }

  process.exit(0);
}

checkCandidateAssociations();