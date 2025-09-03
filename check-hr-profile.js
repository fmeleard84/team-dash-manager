import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHrProfile() {
  const profileId = '922efb64-1684-45ec-8aea-436c4dad2f37';
  
  console.log('🔍 Vérification du profil HR:', profileId);
  
  // Essayer de récupérer le profil HR
  const { data, error } = await supabase
    .from('hr_profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  
  if (error) {
    console.error('❌ Erreur:', error);
  } else {
    console.log('✅ Profil HR trouvé:', data);
  }
  
  process.exit(0);
}

checkHrProfile().catch(console.error);