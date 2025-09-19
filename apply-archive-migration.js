import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.bAuAkBr7zzlJCHN0tXNW94qNhtF9i0WgTvE5OjyL6j4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔄 Application de la migration d\'archivage...\n');
  
  try {
    // Lire le fichier SQL
    const sql = fs.readFileSync('./apply-archive-migration.sql', 'utf8');
    
    // On ne peut pas exécuter directement du SQL brut via Supabase JS
    // Donc on va créer les fonctions une par une via des appels individuels
    
    console.log('❌ Impossible d\'exécuter directement le SQL via Supabase JS');
    console.log('✅ Utilisez l\'interface Supabase Dashboard pour exécuter le SQL suivant:\n');
    console.log('1. Allez sur https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new');
    console.log('2. Collez et exécutez le contenu du fichier apply-archive-migration.sql');
    console.log('3. Ou exécutez cette commande avec psql:\n');
    
    console.log(`PGPASSWORD="Raymonde7510_2a" psql \\
  -h aws-0-eu-central-1.pooler.supabase.com \\
  -p 6543 \\
  -d postgres \\
  -U postgres.egdelmcijszuapcpglsy \\
  -f apply-archive-migration.sql`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

applyMigration();