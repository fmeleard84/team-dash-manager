#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// Use the ANON key for simple test
const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('🔍 Test de connexion simple\n');

  try {
    // Test 1: Connexion basique
    const { data, error } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai')
      .eq('is_ai', true)
      .limit(5);

    if (error) {
      console.error('❌ Erreur:', error);
    } else {
      console.log(`✅ ${data?.length || 0} profils IA trouvés`);
      if (data && data.length > 0) {
        for (const ia of data) {
          console.log(`  - ${ia.name} (ID: ${ia.id})`);
        }
      }
    }

    // Test 2: Compter les projets
    const { count, error: countError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erreur comptage projets:', countError);
    } else {
      console.log(`\n📊 Total projets: ${count}`);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

test();