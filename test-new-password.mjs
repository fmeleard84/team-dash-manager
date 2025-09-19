import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

console.log('🔐 Test de connexion avec le nouveau mot de passe...\n');

// Test 1: Connexion directe PostgreSQL
console.log('1️⃣ Test connexion PostgreSQL directe...');
const pgClient = new Client({
  connectionString: 'postgresql://postgres.egdelmcijszuapcpglsy:Raymonde7510_2a@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
});

try {
  await pgClient.connect();
  const result = await pgClient.query('SELECT COUNT(*) FROM projects');
  console.log(`   ✅ Connexion réussie ! ${result.rows[0].count} projets trouvés\n`);
  await pgClient.end();
} catch (error) {
  console.log(`   ❌ Erreur: ${error.message}\n`);
}

// Test 2: Test avec psql via bash
console.log('2️⃣ Test avec psql...');
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

try {
  const { stdout } = await execAsync(
    `PGPASSWORD="Raymonde7510_2a" psql "postgresql://postgres.egdelmcijszuapcpglsy:Raymonde7510_2a@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT current_database();" -t`
  );
  console.log(`   ✅ Connexion psql réussie ! Base: ${stdout.trim()}\n`);
} catch (error) {
  console.log(`   ❌ Erreur psql: ${error.message}\n`);
}

console.log('✅ Tests terminés !');