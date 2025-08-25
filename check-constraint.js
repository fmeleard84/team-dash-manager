import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConstraint() {
  console.log('🔍 Vérification de la contrainte sur hr_resource_assignments...\n');
  
  try {
    // Essayer d'obtenir les informations sur la table
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', '0461d6f0-3b54-4691-82e8-b28bf9cc8cbc')
      .eq('profile_id', '922efb64-1684-45ec-8aea-436c4dad2f37');
    
    if (error) {
      console.error('Erreur:', error);
      return;
    }
    
    console.log('Enregistrements existants avec ce profile_id:');
    if (data && data.length > 0) {
      console.log(`- ${data.length} enregistrement(s) trouvé(s)`);
      data.forEach(d => {
        console.log(`  ID: ${d.id}, Seniority: ${d.seniority}`);
      });
    } else {
      console.log('Aucun enregistrement trouvé');
    }
    
    console.log('\n📝 Solution: La contrainte unique empêche d\'avoir plusieurs membres d\'équipe.');
    console.log('Il faut soit:');
    console.log('1. Supprimer la contrainte unique sur (project_id, profile_id)');
    console.log('2. Ou créer un profil HR unique pour chaque membre d\'équipe');
    
  } catch (err) {
    console.error('Erreur inattendue:', err);
  }
}

checkConstraint();