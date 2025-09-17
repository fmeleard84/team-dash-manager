import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Clock, AlertTriangle, CheckCircle,
  XCircle, Timer, Sparkles, Brain, Target,
  Send, RefreshCw, Award
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

interface QualificationTestManagerProps {
  candidateProfile: any;
  onStartTest: () => void;
  testScore?: number;
  testStatus?: 'validated' | 'stand_by' | 'rejected';
  testAnswers?: any[];
}

// Seuils de validation
const THRESHOLDS = {
  VALIDATED: 90,    // ≥90% → Validé automatiquement
  STAND_BY: 60,     // 60-89% → Stand-by (validation manuelle)
  REJECTED: 0       // <60% → Rejeté
};

export const QualificationTestManager = ({
  candidateProfile,
  onStartTest,
  testScore,
  testStatus,
  testAnswers
}: QualificationTestManagerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lastTestDate, setLastTestDate] = useState<Date | null>(null);
  const [canRetakeTest, setCanRetakeTest] = useState(false);
  const [qualificationStatus, setQualificationStatus] = useState<string>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [testHistory, setTestHistory] = useState<any[]>([]);

  // Charger l'historique des tests
  useEffect(() => {
    loadTestHistory();
  }, [user?.id]);

  const loadTestHistory = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Récupérer le statut actuel du candidat
      const { data: profile } = await supabase
        .from('candidate_profiles')
        .select('qualification_status')
        .eq('id', user.id)
        .single();

      if (profile) {
        setQualificationStatus(profile.qualification_status || 'pending');
      }

      // Récupérer l'historique des tests
      const { data: results } = await supabase
        .from('candidate_qualification_results')
        .select('*')
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false });

      if (results && results.length > 0) {
        setTestHistory(results);
        const lastTest = results[0];
        setLastTestDate(new Date(lastTest.completed_at || lastTest.created_at));

        // Vérifier si le candidat peut repasser le test (24h après un échec)
        if (lastTest.status === 'failed' || lastTest.status === 'rejected') {
          const hoursSinceLastTest = differenceInHours(new Date(), new Date(lastTest.completed_at));
          setCanRetakeTest(hoursSinceLastTest >= 24);
        }
      } else {
        setCanRetakeTest(true); // Pas de test précédent
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sauvegarder les résultats du test
  const saveTestResults = async (score: number, status: string, answers: any[]) => {
    if (!user?.id) return;

    try {
      // Sauvegarder dans candidate_qualification_results
      const { data: testResult, error: testError } = await supabase
        .from('candidate_qualification_results')
        .insert({
          candidate_id: user.id,
          test_id: `test_${Date.now()}`, // ID temporaire
          score: Math.round(score),
          max_score: 100,
          status: status === 'validated' ? 'passed' : status === 'stand_by' ? 'pending' : 'failed',
          answers: answers,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

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
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Si stand_by, envoyer un email à l'équipe
      if (status === 'stand_by') {
        await sendValidationEmail(score, answers);
      }

      toast.success('Résultats du test enregistrés');
      loadTestHistory(); // Recharger l'historique

    } catch (error) {
      console.error('Erreur sauvegarde résultats:', error);
      toast.error('Erreur lors de la sauvegarde des résultats');
    }
  };

  // Envoyer un email pour validation manuelle
  const sendValidationEmail = async (score: number, answers: any[]) => {
    try {
      // Utiliser la Edge Function pour envoyer l'email
      const { error } = await supabase.functions.invoke('send-validation-email', {
        body: {
          to: 'hello@vaya.rip',
          subject: `[Validation Manuelle] ${candidateProfile?.first_name} ${candidateProfile?.last_name} - Score: ${score}%`,
          candidateId: user?.id,
          candidateName: `${candidateProfile?.first_name} ${candidateProfile?.last_name}`,
          candidateEmail: candidateProfile?.email,
          profile: candidateProfile?.profile_name || candidateProfile?.profile_id,
          seniority: candidateProfile?.seniority,
          languages: candidateProfile?.languages || [],
          expertises: candidateProfile?.expertises || [],
          score: score,
          answers: answers,
          testDate: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Erreur envoi email validation:', error);
      }
    } catch (error) {
      console.error('Erreur envoi email:', error);
    }
  };

  // Gérer la fin du test
  const handleTestComplete = async (score: number, status: string, answers: any[]) => {
    await saveTestResults(score, status, answers);
  };

  // Obtenir la couleur du badge selon le statut
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'qualified':
      case 'validated':
      case 'passed':
        return 'bg-green-500';
      case 'stand_by':
      case 'pending':
        return 'bg-yellow-500';
      case 'rejected':
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Obtenir l'icône selon le statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'qualified':
      case 'validated':
      case 'passed':
        return <CheckCircle className="h-5 w-5" />;
      case 'stand_by':
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'rejected':
      case 'failed':
        return <XCircle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto animate-pulse">
        <CardContent className="p-8">
          <div className="h-8 bg-neutral-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-neutral-200 rounded w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statut actuel */}
      <Card className="border-2 border-primary-200 dark:border-primary-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary-500" />
                Test de Qualification Professionnel
              </CardTitle>
              <CardDescription>
                Validez vos compétences pour accéder aux missions
              </CardDescription>
            </div>
            <Badge className={`${getStatusBadgeColor(qualificationStatus)} text-white px-4 py-2`}>
              <span className="mr-2">{getStatusIcon(qualificationStatus)}</span>
              {qualificationStatus === 'qualified' ? 'Validé' :
               qualificationStatus === 'stand_by' ? 'En attente' :
               qualificationStatus === 'rejected' ? 'Non validé' :
               'Non testé'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Informations sur le test */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-5 w-5 text-primary-500" />
                <span className="font-medium">Objectif</span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                10 questions adaptées à votre profil de {candidateProfile?.profile_name || candidateProfile?.profile_id}
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Timer className="h-5 w-5 text-primary-500" />
                <span className="font-medium">Durée estimée</span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                15-20 minutes en moyenne
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="h-5 w-5 text-primary-500" />
                <span className="font-medium">Seuils de validation</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-green-600 dark:text-green-400">≥90% : Validation auto</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400">60-89% : Validation manuelle</div>
                <div className="text-xs text-red-600 dark:text-red-400">&lt;60% : Non validé</div>
              </div>
            </div>
          </div>

          {/* Dernier test */}
          {lastTestDate && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Dernier test passé le {format(lastTestDate, 'dd MMMM yyyy à HH:mm', { locale: fr })}
                {testHistory[0]?.score && ` - Score: ${testHistory[0].score}%`}
              </AlertDescription>
            </Alert>
          )}

          {/* Bouton d'action */}
          <div className="flex justify-center">
            {qualificationStatus === 'qualified' ? (
              <Alert className="max-w-md">
                <Award className="h-4 w-4" />
                <AlertDescription>
                  Votre profil est validé ! Vous pouvez recevoir des missions.
                </AlertDescription>
              </Alert>
            ) : qualificationStatus === 'stand_by' ? (
              <Alert className="max-w-md">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Votre profil est en cours de validation manuelle par notre équipe.
                  Vous serez notifié sous 24-48h.
                </AlertDescription>
              </Alert>
            ) : canRetakeTest ? (
              <Button
                onClick={onStartTest}
                size="lg"
                className="gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Sparkles className="h-5 w-5" />
                {lastTestDate ? 'Repasser le test' : 'Démarrer le test'}
              </Button>
            ) : (
              <Alert className="max-w-md" variant="destructive">
                <Timer className="h-4 w-4" />
                <AlertDescription>
                  Vous pourrez repasser le test dans {24 - differenceInHours(new Date(), lastTestDate!)} heures.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Historique des tests */}
      {testHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testHistory.map((test, index) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      test.status === 'passed' ? 'bg-green-500' :
                      test.status === 'pending' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium text-sm">
                        Test #{testHistory.length - index}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {format(new Date(test.completed_at || test.created_at), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-lg">{test.score}%</div>
                      <Badge variant="outline" className="text-xs">
                        {test.status === 'passed' ? 'Réussi' :
                         test.status === 'pending' ? 'En attente' :
                         'Échoué'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};