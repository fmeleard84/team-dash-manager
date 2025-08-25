const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

async function checkCandidateProfile() {
  console.log('🔍 Vérification profil candidat fmeleard+ressource_5@gmail.com');
  
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('id, email, first_name, last_name, profile_id, hr_profiles(name)')
    .eq('email', 'fmeleard+ressource_5@gmail.com')
    .maybeSingle();
    
  if (!candidate) {
    console.log('❌ Candidat non trouvé !');
    return;
  }
  
  console.log('✅ Candidat trouvé:');
  console.log('  Email:', candidate.email);
  console.log('  Profil métier:', candidate.hr_profiles?.name);
  console.log('  Profile ID:', candidate.profile_id);
  
  const marketingProfileId = '922efb64-1684-45ec-8aea-436c4dad2f37';
  const isMarketingDirector = candidate.profile_id === marketingProfileId;
  console.log('  Est Directeur marketing:', isMarketingDirector ? 'OUI' : 'NON');
  
  const { data: languages } = await supabase
    .from('candidate_languages')
    .select('hr_languages(name)')
    .eq('candidate_id', candidate.id);
    
  const languageNames = languages?.map(l => l.hr_languages?.name).filter(Boolean) || [];
  console.log('  Langues:', languageNames.join(', ') || 'Aucune');
  
  const { data: expertises } = await supabase
    .from('candidate_expertises')
    .select('hr_expertises(name)')
    .eq('candidate_id', candidate.id);
    
  const expertiseNames = expertises?.map(e => e.hr_expertises?.name).filter(Boolean) || [];
  console.log('  Expertises:', expertiseNames.join(', ') || 'Aucune');
  
  const isEligible = isMarketingDirector && languageNames.includes('Français') && expertiseNames.includes('Google Ads');
  console.log('\n🎯 ÉLIGIBLE:', isEligible ? 'OUI' : 'NON');
  
  if (!isEligible) {
    console.log('\n🔧 Actions requises:');
    if (!isMarketingDirector) console.log('  - Assigner le profil Directeur marketing');
    if (!languageNames.includes('Français')) console.log('  - Ajouter la langue Français');
    if (!expertiseNames.includes('Google Ads')) console.log('  - Ajouter l\'expertise Google Ads');
  }
}

checkCandidateProfile().catch(console.error);