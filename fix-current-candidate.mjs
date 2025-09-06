import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCurrentCandidate() {
  const candidateId = '24bfe2a7-a586-4c2d-969d-23ce478d007e';
  
  console.log('\n🔧 Création du profil pour le candidat existant...\n');

  try {
    // 1. Récupérer les infos de l'utilisateur
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(candidateId);
    
    if (userError || !user) {
      console.error('Utilisateur non trouvé:', userError);
      return;
    }

    console.log('Utilisateur trouvé:', user.email);
    console.log('Metadata:', user.user_metadata);

    // 2. Vérifier si le profil existe déjà
    const { data: existingProfile } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (existingProfile) {
      console.log('✅ Le profil existe déjà');
      console.log('Données actuelles:', {
        profile_id: existingProfile.profile_id,
        seniority: existingProfile.seniority,
        status: existingProfile.status,
        qualification_status: existingProfile.qualification_status
      });
      return;
    }

    // 3. Créer le profil candidat
    console.log('Création du profil candidat...');
    
    const { error: insertError } = await supabase
      .from('candidate_profiles')
      .insert({
        id: candidateId,
        email: user.email,
        first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
        last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
        phone: user.user_metadata?.phone || '',
        status: 'qualification',
        qualification_status: 'pending',
        seniority: null, // NULL pour forcer l'onboarding
        profile_id: null, // NULL pour forcer l'onboarding
        daily_rate: 0,
        password_hash: '',
        is_email_verified: user.email_confirmed_at !== null
      });

    if (insertError) {
      console.error('❌ Erreur création profil candidat:', insertError);
    } else {
      console.log('✅ Profil candidat créé avec succès');
    }

    // 4. Créer aussi dans profiles si nécessaire
    await supabase
      .from('profiles')
      .insert({
        id: candidateId,
        email: user.email,
        role: 'candidate',
        first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
        last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
        phone: user.user_metadata?.phone || ''
      })
      .select();
    // Ignorer l'erreur si existe déjà

    console.log('\n=== PROFIL CRÉÉ ===');
    console.log('Le candidat devrait maintenant voir l\'onboarding');
    console.log('Rafraîchissez votre page pour voir l\'onboarding');

  } catch (error) {
    console.error('Erreur:', error);
  }

  process.exit(0);
}

fixCurrentCandidate();