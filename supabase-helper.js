#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger la configuration
const envPath = path.join(__dirname, '.env.supabase');
if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env.supabase non trouvé!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  }
});

// Fonction pour exécuter du SQL
function executeSql(sql) {
  const command = `PGPASSWORD="${env.SUPABASE_DB_PASSWORD}" psql -h ${env.SUPABASE_DB_HOST} -p ${env.SUPABASE_DB_PORT} -U ${env.SUPABASE_DB_USER} -d ${env.SUPABASE_DB_NAME} -c "${sql.replace(/"/g, '\\"')}"`;
  
  try {
    const result = execSync(command, { encoding: 'utf8' });
    console.log('✅ SQL exécuté avec succès:');
    console.log(result);
    return true;
  } catch (error) {
    console.error('❌ Erreur SQL:', error.message);
    return false;
  }
}

// Fonction pour exécuter un fichier SQL
function executeSqlFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier non trouvé: ${filePath}`);
    return false;
  }

  const command = `PGPASSWORD="${env.SUPABASE_DB_PASSWORD}" psql -h ${env.SUPABASE_DB_HOST} -p ${env.SUPABASE_DB_PORT} -U ${env.SUPABASE_DB_USER} -d ${env.SUPABASE_DB_NAME} < "${filePath}"`;
  
  try {
    execSync(command, { encoding: 'utf8' });
    console.log(`✅ Fichier SQL exécuté: ${filePath}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  }
}

// Interface CLI
const args = process.argv.slice(2);
const command = args[0];

console.log('🔧 Supabase Helper Tool\n');

switch (command) {
  case 'sql':
    if (!args[1]) {
      console.error('Usage: supabase-helper.js sql "VOTRE_REQUETE_SQL"');
      process.exit(1);
    }
    executeSql(args[1]);
    break;

  case 'file':
    if (!args[1]) {
      console.error('Usage: supabase-helper.js file chemin/vers/fichier.sql');
      process.exit(1);
    }
    executeSqlFile(args[1]);
    break;

  case 'test':
    console.log('Test de connexion...');
    executeSql('SELECT version()');
    break;

  case 'help':
  default:
    console.log('Usage:');
    console.log('  supabase-helper.js sql "SELECT * FROM profiles LIMIT 1"  - Exécuter une requête SQL');
    console.log('  supabase-helper.js file migration.sql                     - Exécuter un fichier SQL');
    console.log('  supabase-helper.js test                                   - Tester la connexion');
    console.log('  supabase-helper.js help                                   - Afficher cette aide');
    console.log('\nConfiguration dans .env.supabase');
    break;
}