import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { AlertTriangle, Sparkles, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeQualificationAgentV2 } from "./RealtimeQualificationAgentV2";

export const ValidationPromoBanner = () => {
  const { user } = useAuth();
  const [isValidated, setIsValidated] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);

  useEffect(() => {
    const checkValidationStatus = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', user.id)  // ID universel maintenant
        .single();

      console.log('📋 Profil candidat récupéré:', data, 'Erreur:', error);

      if (data) {
        // qualified = validé, pending = en attente, rejected = rejeté
        const isQualified = data.qualification_status === 'qualified';
        setIsValidated(isQualified);
        // Montrer la bannière si le candidat est pending ou rejected (ou null)
        setShowBanner(data.qualification_status !== 'qualified');

        // Récupérer les infos du métier séparément si profile_id existe
        let profileName = 'Profil général';
        let categoryName = 'Généraliste';

        if (data.profile_id) {
          try {
            const { data: hrProfile } = await supabase
              .from('hr_profiles')
              .select(`
                id,
                name,
                hr_categories (
                  id,
                  name
                )
              `)
              .eq('id', data.profile_id)
              .single();

            if (hrProfile) {
              profileName = hrProfile.name || 'Profil général';
              categoryName = hrProfile.hr_categories?.name || 'Généraliste';
            }
          } catch (hrError) {
            console.warn('⚠️ Erreur récupération hr_profiles:', hrError);
          }
        }

        // Enrichir le profil avec les infos métier
        const enrichedProfile = {
          ...data,
          profile_name: profileName,
          category: categoryName,
          seniority: data.seniority || 'junior',
          languages: Array.isArray(data.languages) ? data.languages :
                    (data.languages ? [data.languages] : ['Français']),
          expertises: Array.isArray(data.expertises) ? data.expertises : []
        };

        console.log('🎯 Profil enrichi pour Sarah:', enrichedProfile);
        setCandidateProfile(enrichedProfile);
      }
      setLoading(false);
    };

    checkValidationStatus();
  }, [user]);

  if (loading || !showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 shadow-xl">
      <div className="relative">
        {/* Animation de fond */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20 animate-pulse" />
        
        <div className="relative px-4 py-3">
          <div className="flex items-center justify-between max-w-full">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50 animate-pulse" />
                <AlertTriangle className="h-6 w-6 text-yellow-300 relative animate-bounce" />
                <Sparkles className="h-4 w-4 text-white absolute -top-1 -right-1 animate-spin" />
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-lg">
                    ⚡ Profil non validé
                  </span>
                  <Badge className="bg-yellow-400 text-yellow-900 font-bold animate-pulse">
                    ACTION REQUISE
                  </Badge>
                </div>
                <span className="text-white/90 text-sm hidden md:block">
                  Validez vos compétences pour accéder aux missions et être visible des clients
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowTestModal(true)}
                className="bg-white text-purple-600 hover:bg-gray-100 font-bold shadow-lg hover:shadow-xl transition-all group animate-pulse hover:animate-none"
                size="default"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Démarrer le test IA
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBanner(false)}
                className="text-white/70 hover:text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de test de qualification fullscreen */}
      <FullScreenModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Test de Qualification IA"
        subtitle="Évaluation de vos compétences avec Sarah, votre recruteuse IA"
      >
        <div className="h-full">
          {candidateProfile && (
            <RealtimeQualificationAgentV2
              candidateProfile={candidateProfile}
              onClose={() => setShowTestModal(false)}
              onTestComplete={async (score, status, answers) => {
                console.log('🎉 Test terminé:', score, status, answers);

                try {
                  // Sauvegarder les résultats - structure minimale
                  const { data: insertedResult, error: testError } = await supabase
                    .from('candidate_qualification_results')
                    .insert({
                      candidate_id: user?.id,
                      test_id: `realtime_${Date.now()}`,
                      score: Math.round(score),
                      max_score: 100,
                      status: status === 'validated' ? 'passed' : status === 'stand_by' ? 'pending' : 'failed'
                      // Utilise created_at par défaut, pas test_date
                    })
                    .select()
                    .single();

                  if (testError) {
                    console.error('❌ Erreur sauvegarde résultats:', testError);
                    console.error('Code:', testError.code, 'Message:', testError.message);
                  } else {
                    console.log('✅ Résultats sauvegardés:', insertedResult);
                  }

                  // Mettre à jour le statut du candidat
                  const newQualificationStatus =
                    status === 'validated' ? 'qualified' :
                    status === 'stand_by' ? 'stand_by' :
                    'rejected';

                  const { error: profileError } = await supabase
                    .from('candidate_profiles')
                    .update({
                      qualification_status: newQualificationStatus,
                      status: status === 'validated' ? 'disponible' : 'qualification'
                    })
                    .eq('id', user?.id);

                  if (profileError) {
                    console.error('Erreur mise à jour profil:', profileError);
                  } else {
                    console.log('✅ Profil mis à jour:', newQualificationStatus);
                  }

                  // Fermer le modal après le test
                  setTimeout(() => {
                    setShowTestModal(false);
                    window.location.reload(); // Rafraîchir pour mettre à jour le statut
                  }, 5000);

                } catch (error) {
                  console.error('Erreur générale:', error);
                }
              }}
              autoStart={true}
            />
          )}
        </div>
      </FullScreenModal>
    </div>
  );
};