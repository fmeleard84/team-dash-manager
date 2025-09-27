import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CandidateProfile {
  id: string;
  user_id: string;
  job_title?: string;
  seniority_level?: string;
  years_experience?: number;
  technical_skills?: string[];
  soft_skills?: string[];
  languages?: string[];
  hourly_rate?: number;
  availability?: string;
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  certifications?: string[];
  education?: string[];
  work_experience?: any[];
}

export function useCandidateProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        console.log('❌ Pas d\'utilisateur connecté');
        setLoading(false);
        return;
      }

      console.log('🔍 Recherche du profil pour user:', user.id);

      try {
        // Récupérer le profil du candidat par ID universel
        const { data: candidateData, error: candidateError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', user.id)  // ID universel maintenant
          .single();

        if (candidateData && !candidateError) {
          console.log('✅ Profil candidat trouvé:', candidateData);
          
          // Récupérer le profil HR associé si profile_id existe
          let hrProfile = null;
          if (candidateData.profile_id) {
            const { data: profileData, error: profileError } = await supabase
              .from('hr_profiles')
              .select(`
                id,
                name,
                hr_categories (
                  id,
                  name
                )
              `)
              .eq('id', candidateData.profile_id)
              .single();
            
            if (!profileError && profileData) {
              hrProfile = profileData;
              console.log('✅ Profil HR trouvé:', hrProfile);
            } else {
              console.log('❌ Erreur récupération profil HR:', profileError);
            }
          }
          
          // Récupérer les expertises
          const { data: expertisesData } = await supabase
            .from('candidate_expertises')
            .select(`
              hr_expertises (
                name
              )
            `)
            .eq('candidate_id', candidateData.id);
          
          // Récupérer les langues
          const { data: languagesData } = await supabase
            .from('candidate_languages')
            .select(`
              hr_languages (
                name
              )
            `)
            .eq('candidate_id', candidateData.id);
          
          // Construire le profil complet
          const expertises = expertisesData?.map(e => e.hr_expertises?.name).filter(Boolean) || [];
          const languages = languagesData?.map(l => l.hr_languages?.name).filter(Boolean) || [];
          
          console.log('📊 Données extraites:');
          console.log('  - Candidate ID:', candidateData.id);
          console.log('  - Profile ID:', candidateData.profile_id);
          console.log('  - Job Title (hr_profiles.name):', hrProfile?.name || 'Non défini');
          console.log('  - Seniority:', candidateData.seniority || 'Non défini');
          console.log('  - Expertises:', expertises);
          console.log('  - Languages:', languages);
          console.log('  - Category:', hrProfile?.hr_categories?.name || 'Non définie');
          
          // Créer le profil final avec toutes les informations
          const finalProfile = {
            id: candidateData.id,
            user_id: candidateData.user_id,
            job_title: hrProfile?.name || 'Non défini', // Le nom dans hr_profiles EST le job title
            seniority_level: candidateData.seniority || 'junior',
            years_experience: candidateData.years_experience,
            technical_skills: expertises,
            soft_skills: candidateData.soft_skills || [],
            languages: languages,
            hourly_rate: candidateData.hourly_rate,
            availability: candidateData.availability || candidateData.status,
            bio: candidateData.bio,
            linkedin_url: candidateData.linkedin_url,
            github_url: candidateData.github_url,
            portfolio_url: candidateData.portfolio_url
          };
          
          console.log('✅ Profil final construit:', finalProfile);
          setProfile(finalProfile);
          setLoading(false);
          return;
        }

        // Si pas trouvé dans candidate_profiles, essayer profiles principal
        const { data: mainProfile, error: mainError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (mainProfile && !mainError) {
          console.log('✅ Profil trouvé dans profiles (fallback):', mainProfile);
          
          setProfile({
            id: mainProfile.id,
            user_id: mainProfile.id,
            job_title: mainProfile.job_title || mainProfile.role,
            seniority_level: mainProfile.seniority || mainProfile.seniority_level,
            years_experience: mainProfile.years_experience,
            technical_skills: mainProfile.skills || mainProfile.technical_skills || [],
            soft_skills: mainProfile.soft_skills || [],
            languages: mainProfile.languages || [],
            hourly_rate: mainProfile.hourly_rate,
            availability: mainProfile.availability,
            bio: mainProfile.bio,
            linkedin_url: mainProfile.linkedin_url,
            github_url: mainProfile.github_url,
            portfolio_url: mainProfile.portfolio_url
          });
          setLoading(false);
          return;
        }

        console.error('❌ Aucun profil trouvé dans aucune table');
        setError('Profil non trouvé');
      } catch (err) {
        console.error('❌ Erreur récupération profil:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user?.id]);

  return { profile, loading, error };
}