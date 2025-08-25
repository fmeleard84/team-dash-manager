import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1OTMyNDksImV4cCI6MjAzODE2OTI0OX0.uLY5dgqqK0elOCdPQxYVzEk5ohjxbPODLn7melInaB4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function invokeFix() {
  console.log('🚀 Invocation de la fonction de correction...\n');
  
  try {
    const { data, error } = await supabase.functions.invoke('apply-team-members-fix', {
      body: {}
    });
    
    if (error) {
      console.error('❌ Erreur:', error.message);
      return;
    }
    
    if (data) {
      console.log('Résultat:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log('\n✅ Succès! La table client_team_members a été corrigée.');
        console.log('Vous pouvez maintenant ajouter des membres d\'équipe sans erreur.');
      } else if (data.instructions) {
        console.log('\n⚠️', data.instructions);
      }
    }
  } catch (err) {
    console.error('❌ Erreur inattendue:', err);
  }
}

invokeFix();