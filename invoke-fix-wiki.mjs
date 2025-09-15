import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixWikiPolicies() {
  try {
    console.log('🔧 Invoking fix-wiki-policies function...');

    const { data, error } = await supabase.functions.invoke('fix-wiki-policies', {
      body: {}
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Result:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Error invoking function:', err);
  }
}

fixWikiPolicies();