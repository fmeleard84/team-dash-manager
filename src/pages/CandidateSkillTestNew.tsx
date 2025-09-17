import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeQualificationAgentV2 } from "@/components/candidate/RealtimeQualificationAgentV2";
import { FullScreenModal, useFullScreenModal } from "@/components/ui/fullscreen-modal";
import {
  Loader2, Brain, Timer, Target,
  AlertCircle, CheckCircle, User, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CandidateSkillTestNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testInProgress, setTestInProgress] = useState(false);
  const [testResults, setTestResults] = useState<{
    score: number;
    status: 'validated' | 'stand_by' | 'rejected';
    answers: any[];
  } | null>(null);

  const modal = useFullScreenModal();

  // Ouvrir automatiquement le modal au montage
  useEffect(() => {
    modal.open();
  }, []);

  // Charger le profil du candidat
  useEffect(() => {
    loadCandidateProfile();
  }, [user?.id]);

  const loadCandidateProfile = async () => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    try {
      // Récupérer le profil complet du candidat avec toutes les données
      const { data: profile, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erreur chargement profil:', error);
        toast.error('Impossible de charger votre profil');
        navigate('/candidate-dashboard');
        return;
      }

      // Récupérer les informations du métier si profile_id existe
      let profileName = 'Non défini';
      let categoryName = 'Non définie';

      if (profile.profile_id) {
        const { data: hrProfile } = await supabase
          .from('hr_profiles')
          .select(`
            id,
            name,
            category_id,
            hr_categories!inner (
              id,
              name
            )
          `)
          .eq('id', profile.profile_id)
          .single();

        if (hrProfile) {
          profileName = hrProfile.name || 'Non défini';
          categoryName = hrProfile.hr_categories?.name || 'Non définie';
        }
      }

      // Récupérer les expertises avec le même schéma que CandidateSettings
      let expertises = [];

      // Récupérer les expertises depuis candidate_expertises avec jointure sur hr_expertises
      const { data: candidateExpertises, error: expertisesError } = await supabase
        .from('candidate_expertises')
        .select(`
          id,
          hr_expertises (
            id,
            name
          )
        `)
        .eq('candidate_id', profile.id);

      if (!expertisesError && candidateExpertises && candidateExpertises.length > 0) {
        expertises = candidateExpertises
          .map(e => e.hr_expertises?.name)
          .filter(Boolean);
      } else if (profile.expertises) {
        // Fallback sur les expertises directement stockées dans le profil
        expertises = Array.isArray(profile.expertises) ? profile.expertises : [];
      }

      // Enrichir le profil avec toutes les informations
      const enrichedProfile = {
        ...profile,
        profile_name: profileName,
        category: categoryName,
        seniority: profile.seniority || 'junior',
        languages: Array.isArray(profile.languages) ? profile.languages :
                  (profile.languages ? [profile.languages] : ['Français']),
        expertises: expertises
      };

      console.log('Profil enrichi:', enrichedProfile);
      setCandidateProfile(enrichedProfile);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
      navigate('/candidate-dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Démarrer le test directement
  const handleStartTest = () => {
    setTestInProgress(true);
    setTestResults(null);
  };

  // Gérer la fin du test
  const handleTestComplete = async (score: number, status: 'validated' | 'stand_by' | 'rejected', answers: any[]) => {
    setTestResults({ score, status, answers });
    setTestInProgress(false);

    // Sauvegarder les résultats dans la base
    try {
      const { error: testError } = await supabase
        .from('candidate_qualification_results')
        .insert({
          candidate_id: user?.id,
          test_id: `realtime_${Date.now()}`,
          score: Math.round(score),
          max_score: 100,
          status: status === 'validated' ? 'passed' : status === 'stand_by' ? 'pending' : 'failed',
          answers: answers,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        });

      if (testError) throw testError;

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

      if (profileError) throw profileError;

      // Notification selon le résultat
      if (status === 'validated') {
        toast.success('🎉 Félicitations ! Votre profil est validé !');
      } else if (status === 'stand_by') {
        toast.info('⏳ Votre profil est en attente de validation');
        await sendValidationEmail(score, answers);
      } else {
        toast.error('Le test nécessite plus de pratique. Vous pourrez le repasser dans 24h');
      }

      // Redirection après 5 secondes
      setTimeout(() => {
        navigate('/candidate-dashboard?section=settings&tab=qualification');
      }, 5000);

    } catch (error) {
      console.error('Erreur sauvegarde résultats:', error);
      toast.error('Erreur lors de la sauvegarde des résultats');
    }
  };

  // Envoyer un email pour validation manuelle
  const sendValidationEmail = async (score: number, answers: any[]) => {
    try {
      const { error } = await supabase.functions.invoke('send-validation-email', {
        body: {
          to: 'hello@vaya.rip',
          subject: `[Validation Manuelle] ${candidateProfile?.first_name} ${candidateProfile?.last_name}`,
          candidateId: user?.id,
          candidateName: `${candidateProfile?.first_name} ${candidateProfile?.last_name}`,
          candidateEmail: candidateProfile?.email,
          profile: candidateProfile?.profile_name,
          seniority: candidateProfile?.seniority,
          languages: candidateProfile?.languages,
          expertises: candidateProfile?.expertises,
          score: score,
          answers: answers,
          testDate: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Erreur envoi email:', error);
      }
    } catch (error) {
      console.error('Erreur envoi email validation:', error);
    }
  };

  const handleClose = () => {
    modal.close();
    navigate('/candidate-dashboard');
  };

  // Affichage du loader
  if (isLoading) {
    return (
      <FullScreenModal
        isOpen={modal.isOpen}
        onClose={handleClose}
        title="Test de Qualification IA"
        hideCloseButton={false}
      >
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500 mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Chargement de votre profil...</p>
        </div>
      </FullScreenModal>
    );
  }

  return (
    <FullScreenModal
      isOpen={modal.isOpen}
      onClose={handleClose}
      title="Test de Qualification IA"
      description="Validez vos compétences avec notre assistant IA"
      hideCloseButton={testInProgress}
      preventClose={testInProgress}
    >
      {testInProgress ? (
        // Agent de test en cours - Affichage direct
        <RealtimeQualificationAgentV2
          candidateProfile={candidateProfile}
          onTestComplete={handleTestComplete}
          autoStart={true}
        />
      ) : testResults ? (
        // Résultats du test
        <div className="max-w-4xl space-y-8">
          <div className="flex items-start gap-4">
            <div className="text-6xl">
              {testResults.status === 'validated' ? '🎉' :
               testResults.status === 'stand_by' ? '⏳' : '💡'}
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">
                {testResults.status === 'validated' ? 'Félicitations !' :
                 testResults.status === 'stand_by' ? 'Test complété' :
                 'Continuez votre progression'}
              </h2>
              <div className="text-xl font-medium text-neutral-700 dark:text-neutral-300">
                Votre évaluation est terminée
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl">
                {testResults.status === 'validated' ?
                  'Votre profil est maintenant validé et vous pouvez recevoir des missions.' :
                 testResults.status === 'stand_by' ?
                  'Notre équipe examinera vos réponses et vous contactera sous 24-48h.' :
                  'Prenez le temps de développer vos compétences. Vous pourrez repasser le test ultérieurement.'}
              </p>
              <Button
                onClick={() => navigate('/candidate-dashboard')}
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl hover:shadow-xl transition-all"
              >
                Retour au tableau de bord
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Écran de démarrage du test
        <div className="max-w-4xl space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Brain className="h-6 w-6 text-primary-500" />
                    Test de Qualification Professionnel
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                    Une conversation naturelle pour valider vos compétences
                  </p>
                </div>
                {candidateProfile?.qualification_status && (
                  <Badge
                    variant={
                      candidateProfile.qualification_status === 'qualified' ? 'default' :
                      candidateProfile.qualification_status === 'stand_by' ? 'secondary' :
                      'destructive'
                    }
                    className="px-4 py-2"
                  >
                    {candidateProfile.qualification_status === 'qualified' ? 'Validé' :
                     candidateProfile.qualification_status === 'stand_by' ? 'En attente' :
                     candidateProfile.qualification_status === 'rejected' ? 'Non validé' :
                     'Non testé'}
                  </Badge>
                )}
              </div>

              {/* Informations du candidat */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="h-5 w-5 text-primary-500" />
                    <span className="font-medium">Votre profil</span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {candidateProfile?.profile_name} • {candidateProfile?.seniority}
                  </p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="h-5 w-5 text-primary-500" />
                    <span className="font-medium">Vos compétences</span>
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                    <div>Langues: {candidateProfile?.languages?.join(', ') || 'À définir'}</div>
                    <div>Expertises: {candidateProfile?.expertises?.length > 0
                      ? candidateProfile.expertises.join(', ')
                      : 'À définir'}</div>
                  </div>
                </div>
              </div>

              {/* Message encourageant sur le test */}
              <Alert className="mb-6 border-primary-200 bg-primary-50 dark:bg-primary-900/20">
                <Sparkles className="h-4 w-4 text-primary-500" />
                <AlertDescription>
                  <strong>Une expérience unique et innovante !</strong>
                  <p className="mt-2 text-sm">
                    Notre assistant IA va converser avec vous de manière naturelle pour comprendre
                    vos compétences et votre expérience. Pas de stress, juste une discussion
                    professionnelle enrichissante qui vous permettra de mettre en valeur votre expertise.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Instructions pratiques */}
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Avant de commencer :</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Installez-vous confortablement dans un endroit calme</li>
                    <li>• Prévoyez environ 15-20 minutes de disponibilité</li>
                    <li>• Activez votre microphone pour l'interaction vocale</li>
                    <li>• Répondez naturellement, comme lors d'un entretien</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Informations sur le test */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Brain className="h-5 w-5 text-primary-500" />
                    <span className="font-medium">Format</span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Conversation interactive adaptée à votre profil
                  </p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Timer className="h-5 w-5 text-primary-500" />
                    <span className="font-medium">Durée</span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    15-20 minutes environ
                  </p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="h-5 w-5 text-primary-500" />
                    <span className="font-medium">Résultats</span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Feedback immédiat après le test
                  </p>
                </div>
              </div>

              {/* Bouton de démarrage */}
              <div className="flex justify-center">
                <Button
                  onClick={handleStartTest}
                  size="lg"
                  className="px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Démarrer la conversation
                </Button>
              </div>
        </div>
      )}
    </FullScreenModal>
  );
}