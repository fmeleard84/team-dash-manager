import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfiles() {
  console.log('🔍 Recherche d\'un profil à utiliser pour les membres d\'équipe...\n');
  
  try {
    // Chercher un profil générique ou créer un profil spécial pour les membres d'équipe
    const { data: profiles, error } = await supabase
      .from('hr_profiles')
      .select('id, name, category_id')
      .or('name.ilike.%membre%,name.ilike.%team%,name.ilike.%équipe%,name.ilike.%interne%')
      .limit(5);
    
    if (error) {
      console.error('Erreur:', error);
      return;
    }
    
    if (profiles && profiles.length > 0) {
      console.log('Profils trouvés qui pourraient convenir:');
      profiles.forEach(p => {
        console.log(`- ${p.name} (ID: ${p.id})`);
      });
      console.log('\n✅ Utilisez l\'un de ces IDs dans le code');
    } else {
      console.log('Aucun profil "membre d\'équipe" trouvé.');
      console.log('\n📝 Recherche d\'un profil générique...');
      
      // Chercher n'importe quel profil valide
      const { data: anyProfile, error: anyError } = await supabase
        .from('hr_profiles')
        .select('id, name')
        .limit(1)
        .single();
      
      if (anyProfile) {
        console.log(`\nProfil générique trouvé: ${anyProfile.name}`);
        console.log(`ID à utiliser: ${anyProfile.id}`);
      }
    }
    
  } catch (err) {
    console.error('Erreur inattendue:', err);
  }
}

checkProfiles();