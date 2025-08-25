import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function finalFix() {
  console.log('🔧 Application finale des corrections...\n');
  
  try {
    // 1. D'abord, invoquer create-exec-sql pour créer la fonction
    console.log('1️⃣ Invocation de create-exec-sql...');
    const { data: execData, error: execError } = await supabase.functions.invoke('create-exec-sql', {
      body: {}
    });
    
    if (execError) {
      console.log('⚠️ create-exec-sql a peut-être déjà été exécuté ou n\'existe pas');
    } else {
      console.log('✅ Fonction exec_sql créée ou déjà existante');
    }
    
    // 2. Maintenant essayer d'utiliser exec_sql pour corriger la table
    console.log('\n2️⃣ Tentative de correction via exec_sql...');
    
    const fixSQL = `
      ALTER TABLE public.client_team_members 
      ADD COLUMN IF NOT EXISTS description TEXT;
      
      ALTER TABLE public.client_team_members 
      ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
      
      ALTER TABLE public.client_team_members 
      ADD COLUMN IF NOT EXISTS department VARCHAR(255);
      
      ALTER TABLE public.client_team_members 
      ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT false;
      
      ALTER TABLE public.client_team_members 
      ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2);
    `;
    
    const { data: fixData, error: fixError } = await supabase.rpc('exec_sql', {
      sql: fixSQL
    });
    
    if (fixError) {
      console.log('❌ exec_sql a échoué:', fixError.message);
      console.log('\n📋 Instructions manuelles:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('\n1. Ouvrez: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new');
      console.log('\n2. Copiez et collez ce SQL:\n');
      console.log(fixSQL);
      console.log('\n3. Cliquez sur "RUN" pour exécuter');
      console.log('\n═══════════════════════════════════════════════════════════════');
    } else {
      console.log('✅ Table corrigée avec succès via exec_sql!');
    }
    
    // 3. Vérifier si les colonnes existent maintenant
    console.log('\n3️⃣ Vérification de la structure de la table...');
    const { data: testData, error: testError } = await supabase
      .from('client_team_members')
      .select('id, first_name, last_name, email, job_title, description, is_billable, daily_rate')
      .limit(1);
    
    if (!testError) {
      console.log('✅ SUCCÈS! Toutes les colonnes sont présentes!');
      console.log('\n🎉 La table client_team_members est maintenant correctement configurée!');
      console.log('Vous pouvez ajouter des membres d\'équipe sans erreur.');
    } else {
      if (testError.message.includes('column') && testError.message.includes('does not exist')) {
        console.log('❌ Certaines colonnes manquent encore:', testError.message);
        console.log('\nVeuillez exécuter le SQL manuellement comme indiqué ci-dessus.');
      } else {
        console.log('⚠️ Erreur lors de la vérification:', testError.message);
      }
    }
    
  } catch (err) {
    console.error('❌ Erreur inattendue:', err);
  }
}

finalFix();