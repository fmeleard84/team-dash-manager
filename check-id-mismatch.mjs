import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIdMismatch() {
  console.log('=== ANALYSE DU PROBLÈME ID UNIVERSEL ===\n');

  // 1. Vérifier le client et ses IDs
  const clientEmail = 'fmeleard+clienr_1119@gmail.com';
  console.log('CLIENT:', clientEmail);
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', clientEmail)
    .single();
    
  if (profile) {
    console.log('- ID actuel (universel):', profile.id);
    console.log('- Role:', profile.role);
    
    // Vérifier dans client_profiles
    const { data: clientProfile } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('email', clientEmail)
      .single();
      
    if (clientProfile) {
      console.log('\nCLIENT_PROFILES:');
      console.log('- ID:', clientProfile.id);
      console.log('- Old ID:', clientProfile.old_id);
      
      // IMPORTANT: Chercher les projets avec l'ancien ID si présent
      if (clientProfile.old_id) {
        console.log('\n=== RECHERCHE PROJETS AVEC OLD_ID ===');
        const { data: oldProjects } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', clientProfile.old_id);
          
        if (oldProjects && oldProjects.length > 0) {
          console.log(`\n⚠️ PROBLÈME IDENTIFIÉ: ${oldProjects.length} projet(s) utilisent l'ancien ID !`);
          oldProjects.forEach(p => {
            console.log(`\nProjet: ${p.title}`);
            console.log('- ID projet:', p.id);
            console.log('- Owner ID (ancien):', p.owner_id);
            console.log('- Status:', p.status);
            console.log('- Date:', p.project_date);
          });
          
          console.log('\n🔧 SOLUTION: Les projets doivent être migrés pour utiliser le nouvel ID universel.');
          console.log(`UPDATE projects SET owner_id = '${clientProfile.id}' WHERE owner_id = '${clientProfile.old_id}';`);
        }
      }
    }
  }
  
  // 2. Vérifier le candidat et ses IDs
  console.log('\n\n=== CANDIDAT ===');
  const candidateEmail = 'fmeleard+new_cdp_id4@gmail.com';
  
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', candidateEmail)
    .single();
    
  if (candidate) {
    console.log('CANDIDAT:', candidateEmail);
    console.log('- ID actuel (universel):', candidate.id);
    console.log('- Old ID:', candidate.old_id);
    console.log('- Profile ID:', candidate.profile_id);
    console.log('- Status:', candidate.status);
    
    // Vérifier les assignations avec l'ancien ID
    if (candidate.old_id) {
      const { data: oldAssignments } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('candidate_id', candidate.old_id);
        
      if (oldAssignments && oldAssignments.length > 0) {
        console.log(`\n⚠️ PROBLÈME: ${oldAssignments.length} assignation(s) utilisent l'ancien ID candidat !`);
        console.log(`UPDATE hr_resource_assignments SET candidate_id = '${candidate.id}' WHERE candidate_id = '${candidate.old_id}';`);
      }
    }
  }
  
  // 3. Diagnostic complet
  console.log('\n\n=== DIAGNOSTIC ===');
  console.log('Le problème vient de la migration ID universel:');
  console.log('1. Les tables profiles, client_profiles et candidate_profiles utilisent les nouveaux ID (auth.uid)');
  console.log('2. MAIS les tables projects et hr_resource_assignments n\'ont PAS été migrées');
  console.log('3. Les projets ont toujours owner_id = ancien ID du client');
  console.log('4. Les assignations peuvent avoir candidate_id = ancien ID du candidat');
  console.log('\nRésultat: Les projets existent mais ne sont pas visibles car les ID ne correspondent plus !');
  
  process.exit(0);
}

checkIdMismatch().catch(console.error);