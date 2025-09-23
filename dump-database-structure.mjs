#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// Configuration pour DÉVELOPPEMENT (car production inaccessible)
const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('📊 Dump de la structure de base de données DÉVELOPPEMENT...\n');

async function getAllTables() {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (error) {
    console.error('❌ Erreur récupération des tables:', error);
    return [];
  }

  return data.map(t => t.table_name);
}

async function getTableColumns(tableName) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position');

  if (error) {
    console.error(`❌ Erreur récupération colonnes ${tableName}:`, error);
    return [];
  }

  return data;
}

async function getTableIndexes(tableName) {
  const query = `
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = '${tableName}'
  `;

  const { data, error } = await supabase.rpc('sql', { query }).single();

  if (error) {
    // Ignorer l'erreur si la fonction n'existe pas
    return [];
  }

  return data || [];
}

async function main() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `database-structure-prod-${timestamp}.json`;

    const structure = {
      timestamp: new Date().toISOString(),
      environment: 'DÉVELOPPEMENT',
      url: SUPABASE_URL,
      tables: {}
    };

    // Récupérer toutes les tables
    const tables = await getAllTables();
    console.log(`✅ Trouvé ${tables.length} tables\n`);

    // Pour chaque table, récupérer sa structure
    for (const tableName of tables) {
      console.log(`📋 Analyse de la table: ${tableName}`);

      const columns = await getTableColumns(tableName);

      structure.tables[tableName] = {
        columns: columns.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default
        }))
      };

      console.log(`   ✓ ${columns.length} colonnes\n`);
    }

    // Sauvegarder dans un fichier
    await fs.writeFile(outputFile, JSON.stringify(structure, null, 2));
    console.log(`\n✅ Structure sauvegardée dans: ${outputFile}`);

    // Créer aussi un fichier SQL pour recréer les tables
    let sqlContent = `-- Structure de base de données PRODUCTION
-- Générée le: ${new Date().toISOString()}
-- Environnement: ${SUPABASE_URL}
-- Tables: ${tables.length}

`;

    for (const [tableName, tableInfo] of Object.entries(structure.tables)) {
      sqlContent += `-- Table: ${tableName}\n`;
      sqlContent += `-- Colonnes: ${tableInfo.columns.length}\n`;
      sqlContent += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;

      const columnDefs = tableInfo.columns.map(col => {
        let def = `  ${col.name} ${col.type}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.default) def += ` DEFAULT ${col.default}`;
        return def;
      });

      sqlContent += columnDefs.join(',\n');
      sqlContent += '\n);\n\n';
    }

    const sqlFile = `database-structure-prod-${timestamp}.sql`;
    await fs.writeFile(sqlFile, sqlContent);
    console.log(`✅ Structure SQL sauvegardée dans: ${sqlFile}`);

    // Statistiques
    console.log('\n📊 Statistiques:');
    console.log(`   - Tables: ${tables.length}`);
    console.log(`   - Tables principales: ${tables.filter(t => !t.startsWith('_')).length}`);
    console.log(`   - Tables système: ${tables.filter(t => t.startsWith('_')).length}`);

    const importantTables = [
      'projects', 'candidate_profiles', 'client_profiles',
      'hr_resource_assignments', 'messages', 'kanban_files',
      'kanban_cards', 'project_embeddings', 'project_embedding_queue'
    ];

    console.log('\n📌 Tables importantes:');
    for (const table of importantTables) {
      const exists = tables.includes(table);
      const icon = exists ? '✅' : '❌';
      const columns = exists ? structure.tables[table]?.columns?.length || 0 : 0;
      console.log(`   ${icon} ${table}${exists ? ` (${columns} colonnes)` : ' - MANQUANTE'}`);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

main();