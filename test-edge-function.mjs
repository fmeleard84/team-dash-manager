import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Test via Edge Function (utilise les clés API)...\n');

const { data, error } = await supabase.functions.invoke('check-projects-status');

if (error) {
  console.error('❌ Erreur:', error);
} else {
  console.log('✅ Edge Function fonctionne !');
  console.log(`   Total projets: ${data.summary.total}`);
  console.log(`   Actifs: ${data.summary.active}`);
  console.log(`   Archivés: ${data.summary.archived}`);
}

console.log('\n📝 Note: Les Edge Functions utilisent les clés API (ANON/SERVICE_ROLE)');
console.log('et ne sont PAS affectées par le changement de mot de passe PostgreSQL.');