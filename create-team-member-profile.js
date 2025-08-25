import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTeamMemberProfile() {
  console.log('🔧 Création d\'un profil HR pour les membres d\'équipe...\n');
  
  try {
    // D'abord, chercher une catégorie appropriée
    const { data: categories, error: catError } = await supabase
      .from('hr_categories')
      .select('id, name')
      .limit(1)
      .single();
    
    if (catError || !categories) {
      console.error('Impossible de trouver une catégorie:', catError);
      return;
    }
    
    console.log(`Utilisation de la catégorie: ${categories.name} (ID: ${categories.id})`);
    
    // Créer un profil spécifique pour les membres d'équipe
    const teamMemberProfile = {
      id: 'e3b4f5a6-7c8d-9e0f-1a2b-3c4d5e6f7a8b', // UUID fixe pour ce profil spécial
      name: 'Membre d\'équipe interne',
      category_id: categories.id,
      base_price: 1.5, // Prix par défaut
      is_ai: false,
      inputs: [],
      outputs: []
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('hr_profiles')
      .upsert(teamMemberProfile, { onConflict: 'id' })
      .select()
      .single();
    
    if (insertError) {
      console.error('Erreur lors de la création:', insertError);
      
      // Si le profil existe déjà, c'est OK
      if (insertError.code === '23505') {
        console.log('✅ Le profil existe déjà avec l\'ID: e3b4f5a6-7c8d-9e0f-1a2b-3c4d5e6f7a8b');
      }
    } else {
      console.log('✅ Profil créé avec succès!');
      console.log('ID du profil:', inserted.id);
      console.log('Nom:', inserted.name);
      console.log('\n📝 Mettez à jour le code pour utiliser cet ID: e3b4f5a6-7c8d-9e0f-1a2b-3c4d5e6f7a8b');
    }
    
  } catch (err) {
    console.error('Erreur inattendue:', err);
  }
}

createTeamMemberProfile();