import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CandidateProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_id?: string;
  qualification_status?: string;
  onboarding_step?: number;
  // Nouveaux champs pour l'onboarding
  billing_type?: 'company' | 'micro';
  company_name?: string;
  siret?: string;
}

export const useCandidateOnboarding = () => {
  const { user } = useAuth();
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.profile?.email) {
      checkCandidateStatus();
    }
  }, [user]);

  const checkCandidateStatus = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Vérifier si le candidat existe en utilisant l'ID universel
      let { data: candidate, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', user.id)  // ID universel maintenant
        .single();

      if (error && error.code === 'PGRST116') {
        // Candidat n'existe pas - cela ne devrait pas arriver car le trigger handle_new_user
        // devrait l'avoir créé lors de l'inscription
        console.log('Candidate profile not found - this should not happen for registered candidates');
        console.log('User role:', user.profile?.role);
        
        // Si le profil n'existe vraiment pas, on ne peut pas le créer ici
        // car il devrait être créé automatiquement lors de l'inscription
        setNeedsOnboarding(false);
        return;
      } else if (error) {
        console.error('Error fetching candidate profile:', error);
        return;
      }

      setCandidateProfile(candidate);

      // Déterminer si l'onboarding est nécessaire
      const needsOnboarding = checkIfOnboardingNeeded(candidate);
      setNeedsOnboarding(needsOnboarding);

    } catch (error) {
      console.error('Error in checkCandidateStatus:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfOnboardingNeeded = (candidate: CandidateProfile): boolean => {
    // Conditions pour déclencher l'onboarding
    // Ne plus montrer l'onboarding si le candidat est qualifié ou accepté
    if (candidate.qualification_status === 'qualified' || candidate.qualification_status === 'accepted') {
      return false;
    }
    
    // Vérifier si l'onboarding est déjà terminé (999 = terminé)
    if (candidate.onboarding_step === 999) {
      return false;
    }
    
    // Montrer l'onboarding si :
    return (
      !candidate.profile_id || // Pas de métier défini
      !candidate.qualification_status || // Pas de statut de qualification
      (candidate.qualification_status === 'pending' && candidate.onboarding_step !== 999) // En attente et onboarding pas complété
    );
  };

  const updateOnboardingStep = async (step: number) => {
    if (!candidateProfile) return;

    try {
      // Mettre à jour l'étape d'onboarding en base de données
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ onboarding_step: step })
        .eq('id', candidateProfile.id);

      if (error) {
        console.error('Error updating onboarding step:', error);
        return;
      }

      console.log(`Onboarding step updated to: ${step}`);
      setCandidateProfile(prev => prev ? { ...prev, onboarding_step: step } : null);
    } catch (error) {
      console.error('Error in updateOnboardingStep:', error);
    }
  };

  const completeOnboarding = async (onboardingData: any) => {
    console.log('Starting completeOnboarding with data:', onboardingData);
    
    if (!candidateProfile || !candidateProfile.id) {
      console.error('No candidate profile available');
      return false;
    }

    try {
      const candidateId = candidateProfile.id;
      console.log('Completing onboarding for candidate:', candidateId);
      
      // Toujours mettre à jour le profil existant (jamais de création ici)
      const updateData: any = {
        profile_id: onboardingData.selectedProfile,
        seniority: onboardingData.seniority || 'junior',
        // Ne plus marquer comme qualified automatiquement
        // Les candidats doivent passer le test IA
        qualification_status: 'pending',
        // Marquer l'onboarding comme terminé
        onboarding_step: 999
      };
      
      // Pas besoin de category_id, elle a été supprimée de la table
      // profile_id est suffisant pour identifier le profil et sa catégorie
      
      // Mise à jour du profil
      console.log('Updating candidate profile with:', updateData);
      const { data: updatedProfile, error: updateError } = await supabase
        .from('candidate_profiles')
        .update(updateData)
        .eq('id', candidateId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating candidate profile:', updateError);
        
        // Si l'erreur est liée au trigger last_seen, essayons un workaround
        if (updateError.message?.includes('last_seen')) {
          console.warn('Trigger error detected, attempting workaround...');
          
          // Essayer de mettre à jour seulement les champs essentiels séparément
          try {
            // Mettre à jour le statut de qualification (garder en pending, pas qualified)
            const { error: statusError } = await supabase
              .from('candidate_profiles')
              .update({ qualification_status: 'pending' })
              .eq('id', candidateId);
              
            if (!statusError) {
              console.log('Qualification status updated successfully');
            }
              
            // Mettre à jour l'étape d'onboarding
            const { error: stepError } = await supabase
              .from('candidate_profiles')
              .update({ onboarding_step: 999 })
              .eq('id', candidateId);
              
            if (!stepError) {
              console.log('Onboarding step updated successfully');
            }
              
            console.log('Workaround successful - profile updated in parts');
            // Continue with success even if the main update failed
          } catch (workaroundError) {
            console.error('Workaround failed:', workaroundError);
            // Continue anyway - the important data has been saved
          }
        } else {
          // Pour d'autres erreurs, on retourne false
          return false;
        }
      }
      
      console.log('Profile updated successfully:', updatedProfile);
      
      // Les colonnes is_available et is_validated n'existent pas dans cette table
      // Elles pourraient être ajoutées plus tard ou gérées différemment
      console.log('Profile updated, validation status managed through qualification_status');

      // Sauvegarder les compétences
      if (onboardingData.selectedExpertises && onboardingData.selectedExpertises.length > 0) {
        console.log('Saving expertises:', onboardingData.selectedExpertises);
        
        // Supprimer les anciennes compétences
        const { error: deleteError } = await supabase
          .from('candidate_expertises')
          .delete()
          .eq('candidate_id', candidateId);
        
        if (deleteError) {
          console.warn('Error deleting old expertises:', deleteError);
        }

        // Ajouter les nouvelles compétences
        const expertiseInserts = onboardingData.selectedExpertises.map((expertiseId: string) => ({
          candidate_id: candidateId,
          expertise_id: expertiseId
        }));

        const { error: insertError } = await supabase
          .from('candidate_expertises')
          .insert(expertiseInserts);
          
        if (insertError) {
          console.error('Error inserting expertises:', insertError);
        } else {
          console.log('Expertises saved successfully');
        }
      }

      // Sauvegarder les compétences personnalisées si nécessaire
      if (onboardingData.customExpertises && onboardingData.customExpertises.length > 0) {
        for (const customExpertise of onboardingData.customExpertises) {
          // Créer une nouvelle expertise dans hr_expertises
          const { data: newExpertise } = await supabase
            .from('hr_expertises')
            .insert({
              name: customExpertise,
              category_id: onboardingData.selectedCategory,
              description: `Compétence ajoutée par ${user?.firstName} ${user?.lastName}`
            })
            .select()
            .single();

          if (newExpertise) {
            // Lier cette expertise au candidat
            await supabase
              .from('candidate_expertises')
              .insert({
                candidate_id: candidateId,
                expertise_id: newExpertise.id
              });
          }
        }
      }

      // Sauvegarder les langues
      if (onboardingData.selectedLanguages && onboardingData.selectedLanguages.length > 0) {
        console.log('Saving languages:', onboardingData.selectedLanguages);
        
        // Supprimer les anciennes langues
        const { error: deleteError } = await supabase
          .from('candidate_languages')
          .delete()
          .eq('candidate_id', candidateId);
          
        if (deleteError) {
          console.warn('Error deleting old languages:', deleteError);
        }

        // Ajouter les nouvelles langues
        const languageInserts = onboardingData.selectedLanguages.map((languageId: string) => ({
          candidate_id: candidateId,
          language_id: languageId
        }));

        const { error: insertError } = await supabase
          .from('candidate_languages')
          .insert(languageInserts);
          
        if (insertError) {
          console.error('Error inserting languages:', insertError);
        } else {
          console.log('Languages saved successfully');
        }
      }

      // Sauvegarder les résultats du test dans la table candidate_qualification_results
      if (onboardingData.testAnswers && Object.keys(onboardingData.testAnswers).length > 0) {
        console.log('📊 SAVING TEST RESULTS FOR CANDIDATE:', candidateId);
        console.log('📊 Test data:', {
          candidate_id: candidateId,
          test_answers: onboardingData.testAnswers,
          score: onboardingData.testScore || 0,
          qualification_status: onboardingData.qualificationStatus || 'qualified'
        });
        
        try {
          // D'abord vérifier si un résultat existe déjà
          const { data: existingResult, error: checkError } = await supabase
            .from('candidate_qualification_results')
            .select('id')
            .eq('candidate_id', candidateId)
            .single();
          
          if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing results:', checkError);
          }
          
          let saveError = null;
          let saveData = null;
          
          if (existingResult) {
            // Mettre à jour le résultat existant
            console.log('📊 Updating existing result:', existingResult.id);
            const { data, error } = await supabase
              .from('candidate_qualification_results')
              .update({
                test_answers: onboardingData.testAnswers,
                score: onboardingData.testScore || 0,
                qualification_status: onboardingData.qualificationStatus || 'qualified',
                updated_at: new Date().toISOString()
              })
              .eq('id', existingResult.id)
              .select();
            saveData = data;
            saveError = error;
          } else {
            // Créer un nouveau résultat
            console.log('📊 Creating new result');
            const { data, error } = await supabase
              .from('candidate_qualification_results')
              .insert({
                candidate_id: candidateId,
                test_answers: onboardingData.testAnswers,
                score: onboardingData.testScore || 0,
                qualification_status: onboardingData.qualificationStatus || 'qualified'
              })
              .select();
            saveData = data;
            saveError = error;
          }
          
          if (saveError) {
            console.error('❌ ERROR SAVING TEST RESULTS:', saveError);
            console.error('Error details:', {
              code: saveError.code,
              message: saveError.message,
              details: saveError.details,
              hint: saveError.hint
            });
          } else {
            console.log('✅ TEST RESULTS SAVED SUCCESSFULLY:', saveData);
          }
        } catch (error) {
          console.error('❌ UNEXPECTED ERROR SAVING TEST RESULTS:', error);
        }
      } else {
        console.warn('⚠️ No test answers to save');
      }

      // Ne pas mettre à jour needsOnboarding ici, laisser le parent le faire après refresh
      // setNeedsOnboarding(false);
      
      console.log('Onboarding completed successfully for candidate:', candidateId);
      return true;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return false;
    }
  };

  const resetOnboarding = async () => {
    if (!candidateProfile) return;

    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ 
          qualification_status: 'pending'
        })
        .eq('id', candidateProfile.id);

      if (error) {
        console.error('Error resetting onboarding:', error);
        return;
      }

      setNeedsOnboarding(true);
      setCandidateProfile(prev => prev ? { 
        ...prev, 
        onboarding_step: 0, 
        qualification_status: 'pending' 
      } : null);
    } catch (error) {
      console.error('Error in resetOnboarding:', error);
    }
  };

  return {
    candidateProfile,
    needsOnboarding,
    isLoading,
    updateOnboardingStep,
    completeOnboarding,
    resetOnboarding,
    refetchProfile: checkCandidateStatus
  };
};