import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function removeDuplicate() {
  console.log('🗑️ Suppression de l\'enregistrement en conflit...\n');
  
  try {
    // Supprimer l'enregistrement qui cause le conflit
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .delete()
      .eq('id', 'ce2b4081-4d07-4fcc-b072-4cd6d8e523af');
    
    if (error) {
      console.error('Erreur lors de la suppression:', error);
    } else {
      console.log('✅ Enregistrement supprimé avec succès');
      console.log('Vous pouvez maintenant ajouter vos membres d\'équipe');
    }
    
  } catch (err) {
    console.error('Erreur inattendue:', err);
  }
}

removeDuplicate();