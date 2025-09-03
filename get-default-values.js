import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDefaults() {
  // Get French language ID
  const { data: frenchLang } = await supabase
    .from('hr_languages')
    .select('id, name')
    .eq('code', 'fr')
    .single();
  
  if (frenchLang) {
    console.log('French language:', frenchLang);
  }
  
  // Get all languages
  const { data: languages } = await supabase
    .from('hr_languages')
    .select('id, name, code')
    .order('name');
  
  console.log('All languages:', languages);
  
  // Get first expertise
  const { data: expertises } = await supabase
    .from('hr_expertises')
    .select('id, name')
    .limit(5);
  
  console.log('Sample expertises:', expertises);
}

getDefaults();