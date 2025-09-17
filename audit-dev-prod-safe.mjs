#!/usr/bin/env node

/**
 * Script d'audit de cohérence entre DEV et PROD (version sécurisée)
 * Les clés doivent être dans des variables d'environnement
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';

// Récupération sécurisée des variables d'environnement
const DEV_URL = process.env.DEV_SUPABASE_URL || 'https://egdelmcijszuapcpglsy.supabase.co';
const DEV_ANON_KEY = process.env.DEV_SUPABASE_ANON_KEY;

const PROD_URL = process.env.PROD_SUPABASE_URL || 'https://nlesrzepybeeghghjafc.supabase.co';
const PROD_ANON_KEY = process.env.PROD_SUPABASE_ANON_KEY;

if (!DEV_ANON_KEY || !PROD_ANON_KEY) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.error('Veuillez configurer:');
  console.error('  - DEV_SUPABASE_ANON_KEY');
  console.error('  - PROD_SUPABASE_ANON_KEY');
  console.error('\nOu créez un fichier .env.local basé sur .env.local.example');
  process.exit(1);
}

const supabaseDev = createClient(DEV_URL, DEV_ANON_KEY);
const supabaseProd = createClient(PROD_URL, PROD_ANON_KEY);

// Tables critiques à vérifier
const CRITICAL_TABLES = [
  'profiles',
  'candidate_profiles',
  'client_profiles',
  'projects',
  'hr_categories',
  'hr_profiles',
  'hr_resource_assignments',
  'hr_expertises',
  'hr_languages',
  'project_events',
  'project_event_attendees',
  'kanban_boards',
  'kanban_columns',
  'kanban_cards',
  'messages',
  'message_attachments',
  'drive_items',
  'notifications',
  'faq_items',
  'prompts_ia',
  'invoice_payments',
  'client_credits',
  'client_credit_transactions',
  'wiki_items',
  'candidate_languages',
  'candidate_expertises',
  'qualification_results'
];

console.log('🚀 AUDIT DE COHÉRENCE DEV/PROD - TEAM DASH MANAGER');
console.log('=' .repeat(60));
console.log(`DEV: ${DEV_URL}`);
console.log(`PROD: ${PROD_URL}`);
console.log('=' .repeat(60));

// Le reste du code reste identique mais utilise les variables d'environnement
// ... (code d'audit)