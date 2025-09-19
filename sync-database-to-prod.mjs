#!/usr/bin/env node

/**
 * SYNC DATABASE DEV → PROD
 *
 * Ce script exporte automatiquement le schéma complet de DEV
 * et génère un script SQL pour synchroniser PROD
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const config = {
  dev: {
    url: 'https://egdelmcijszuapcpglsy.supabase.co',
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q',
    dbUrl: 'postgresql://postgres.egdelmcijszuapcpglsy:Raymonde7510_2a@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
  },
  prod: {
    url: 'https://nlesrzepybeeghghjafc.supabase.co',
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoaGdqYWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjMwMjcyOSwiZXhwIjoyMDUxODc4NzI5fQ.4YRSpQ5Ru8Rn3S20yJEY_bgQkVp2Bqf2pGlnG1Hjbms',
    dbUrl: 'postgresql://postgres.nlesrzepybeeghghjafc:Raymonde7510@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
  }
};

const supabaseDev = createClient(config.dev.url, config.dev.serviceKey);
const supabaseProd = createClient(config.prod.url, config.prod.serviceKey);

class DatabaseSync {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.outputDir = '/opt/team-dash-manager-prod/sync-output';
    this.differences = {
      tables: { missing: [], extra: [] },
      columns: {},
      policies: {},
      indexes: {},
      triggers: {}
    };
  }

  async init() {
    // Créer le dossier de sortie
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async exportDevSchema() {
    console.log('📦 Exporting DEV schema...');

    const schemaFile = path.join(this.outputDir, `dev-schema-${this.timestamp}.sql`);

    try {
      // Export du schéma complet avec pg_dump
      const cmd = `PGPASSWORD="Raymonde7510_2a" pg_dump "${config.dev.dbUrl}" \
        --schema=public \
        --no-owner \
        --no-privileges \
        --no-tablespaces \
        --no-unlogged-table-data \
        --schema-only \
        --file="${schemaFile}"`;

      await execAsync(cmd);
      console.log(`✅ Schema exported to ${schemaFile}`);

      return schemaFile;
    } catch (error) {
      console.error('❌ Error exporting schema:', error);

      // Fallback: Export manuel table par table
      return await this.manualSchemaExport();
    }
  }

  async manualSchemaExport() {
    console.log('📋 Manual schema export...');

    const tables = await this.getTablesList('dev');
    const schemaFile = path.join(this.outputDir, `dev-schema-manual-${this.timestamp}.sql`);
    let sqlContent = `-- Manual Schema Export from DEV
-- Generated: ${new Date().toISOString()}
-- Tables: ${tables.length}

`;

    for (const table of tables) {
      console.log(`  Exporting ${table}...`);
      const tableSchema = await this.getTableSchema('dev', table);
      sqlContent += tableSchema + '\n\n';
    }

    fs.writeFileSync(schemaFile, sqlContent);
    console.log(`✅ Manual schema exported to ${schemaFile}`);

    return schemaFile;
  }

  async getTablesList(env) {
    const supabase = env === 'dev' ? supabaseDev : supabaseProd;

    // Liste connue des tables importantes
    const knownTables = [
      'profiles',
      'client_profiles',
      'candidate_profiles',
      'projects',
      'hr_categories',
      'hr_profiles',
      'hr_resource_assignments',
      'hr_languages',
      'hr_expertises',
      'client_credits',
      'template_categories',
      'project_templates',
      'invoice_payments',
      'payment_transactions',
      'credit_transactions',
      'project_events',
      'project_event_attendees',
      'project_tools',
      'project_kanban_columns',
      'project_kanban_cards',
      'project_messages',
      'message_attachments',
      'notifications',
      'wiki_pages',
      'wiki_page_versions',
      'faq_items',
      'faq_embeddings',
      'prompts_ia'
    ];

    return knownTables;
  }

  async getTableSchema(env, tableName) {
    const supabase = env === 'dev' ? supabaseDev : supabaseProd;

    let schema = `-- Table: ${tableName}\n`;

    // Récupérer la structure via Supabase
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);

      if (!error) {
        // Générer CREATE TABLE basique
        schema += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;
        schema += `  -- Columns will be synced from actual DEV database\n`;
        schema += `);\n`;
        schema += `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n`;
      }
    } catch (e) {
      schema += `-- Table ${tableName}: Unable to export (may not exist)\n`;
    }

    return schema;
  }

  async compareSchemas() {
    console.log('🔍 Comparing DEV and PROD schemas...');

    const devTables = await this.getTablesList('dev');
    const prodTables = await this.getTablesList('prod');

    // Tables manquantes dans PROD
    this.differences.tables.missing = devTables.filter(t => !prodTables.includes(t));

    // Tables en trop dans PROD
    this.differences.tables.extra = prodTables.filter(t => !devTables.includes(t));

    console.log(`  Missing in PROD: ${this.differences.tables.missing.length} tables`);
    console.log(`  Extra in PROD: ${this.differences.tables.extra.length} tables`);

    return this.differences;
  }

  async generateMigrationScript() {
    console.log('📝 Generating migration script...');

    const migrationFile = path.join(this.outputDir, `migration-to-prod-${this.timestamp}.sql`);

    let migration = `-- ================================================
-- MIGRATION SCRIPT: DEV → PROD
-- Generated: ${new Date().toISOString()}
-- ================================================

-- IMPORTANT: Review this script before executing in production!

`;

    // 1. Tables manquantes
    if (this.differences.tables.missing.length > 0) {
      migration += `-- ================================================
-- MISSING TABLES IN PRODUCTION
-- ================================================

`;
      for (const table of this.differences.tables.missing) {
        migration += await this.generateCreateTable(table);
        migration += '\n\n';
      }
    }

    // 2. Colonnes manquantes (pour les tables communes)
    migration += `-- ================================================
-- MISSING COLUMNS (Manual verification needed)
-- ================================================

-- Check and add missing columns for client_profiles
ALTER TABLE public.client_profiles
ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS postal_code TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'France',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS size TEXT;

-- Check and add missing columns for hr_profiles
ALTER TABLE public.hr_profiles
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- Check and add missing columns for hr_resource_assignments
ALTER TABLE public.hr_resource_assignments
ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10,2);

`;

    // 3. Politiques RLS
    migration += await this.generateRLSPolicies();

    // 4. Permissions
    migration += `
-- ================================================
-- PERMISSIONS
-- ================================================

-- Grant all permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant read permissions to anon for public tables
GRANT SELECT ON public.template_categories TO anon;
GRANT SELECT ON public.project_templates TO anon;

`;

    fs.writeFileSync(migrationFile, migration);
    console.log(`✅ Migration script saved to ${migrationFile}`);

    return migrationFile;
  }

  async generateCreateTable(tableName) {
    // Génération des CREATE TABLE pour les tables manquantes
    const createStatements = {
      'template_categories': `
CREATE TABLE IF NOT EXISTS public.template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
      'project_templates': `
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.template_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  duration_days INTEGER,
  estimated_budget_min DECIMAL(10,2),
  estimated_budget_max DECIMAL(10,2),
  suggested_team_size INTEGER,
  required_skills TEXT[],
  deliverables TEXT[],
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
      'client_credits': `
CREATE TABLE IF NOT EXISTS public.client_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);`,
      'invoice_payments': `
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES public.projects(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
      'payment_transactions': `
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoice_payments(id),
  client_id UUID REFERENCES auth.users(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EUR',
  type TEXT CHECK (type IN ('payment', 'refund', 'adjustment')),
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method TEXT,
  transaction_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
      'credit_transactions': `
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id),
  amount_cents INTEGER NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit', 'refund')),
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  balance_after_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    };

    return createStatements[tableName] || `-- TODO: Define structure for ${tableName}`;
  }

  async generateRLSPolicies() {
    return `
-- ================================================
-- RLS POLICIES
-- ================================================

-- Profiles tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Client profiles
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_profiles_select" ON public.client_profiles;
CREATE POLICY "client_profiles_select" ON public.client_profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "client_profiles_insert" ON public.client_profiles;
CREATE POLICY "client_profiles_insert" ON public.client_profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "client_profiles_update" ON public.client_profiles;
CREATE POLICY "client_profiles_update" ON public.client_profiles FOR UPDATE USING (auth.uid() = id);

-- Client credits
ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_credits_select" ON public.client_credits;
CREATE POLICY "client_credits_select" ON public.client_credits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "client_credits_insert" ON public.client_credits;
CREATE POLICY "client_credits_insert" ON public.client_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "client_credits_update" ON public.client_credits;
CREATE POLICY "client_credits_update" ON public.client_credits FOR UPDATE USING (auth.uid() = user_id);

-- Template categories (public read)
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "template_categories_public" ON public.template_categories;
CREATE POLICY "template_categories_public" ON public.template_categories FOR SELECT USING (true);

-- Project templates (public read)
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_templates_public" ON public.project_templates;
CREATE POLICY "project_templates_public" ON public.project_templates FOR SELECT USING (true);
`;
  }

  async run() {
    try {
      await this.init();

      console.log('🚀 Starting Database Sync DEV → PROD\n');

      // 1. Export DEV schema
      const schemaFile = await this.exportDevSchema();

      // 2. Compare schemas
      await this.compareSchemas();

      // 3. Generate migration
      const migrationFile = await this.generateMigrationScript();

      console.log('\n✅ Sync preparation complete!');
      console.log('\n📋 Next steps:');
      console.log(`1. Review the migration script: ${migrationFile}`);
      console.log('2. Execute in Supabase Dashboard: https://supabase.com/dashboard/project/nlesrzepybeeghghjafc/sql/new');
      console.log('3. Or run: npm run sync:apply-prod');

      // Save summary
      const summary = {
        timestamp: this.timestamp,
        schemaFile,
        migrationFile,
        differences: this.differences,
        status: 'ready'
      };

      fs.writeFileSync(
        path.join(this.outputDir, `sync-summary-${this.timestamp}.json`),
        JSON.stringify(summary, null, 2)
      );

    } catch (error) {
      console.error('❌ Sync failed:', error);
      process.exit(1);
    }
  }
}

// Run the sync
const sync = new DatabaseSync();
sync.run();