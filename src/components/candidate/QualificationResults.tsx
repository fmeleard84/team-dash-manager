import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Trophy, Target, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface QualificationResultsProps {
  candidateId: string;
}

export const QualificationResults = ({ candidateId }: QualificationResultsProps) => {
  // Fetch test results from database
  const { data: testResults, isLoading } = useQuery({
    queryKey: ['qualificationResults', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_qualification_results')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching test results:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!candidateId
  });

  // Fetch candidate profile for additional info
  const { data: candidateProfile } = useQuery({
    queryKey: ['candidateProfile', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('qualification_status, created_at, updated_at')
        .eq('id', candidateId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!candidateId
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Chargement des résultats...</p>
        </CardContent>
      </Card>
    );
  }

  if (!testResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Aucun test de qualification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Vous n'avez pas encore passé de test de qualification. 
            Ce test est normalement effectué lors de votre première connexion.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'qualified':
        return (
          <Badge className="bg-green-100 text-green-800 gap-1">
            <CheckCircle className="h-3 w-3" />
            Qualifié
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-800 gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 gap-1">
            <XCircle className="h-3 w-3" />
            Non qualifié
          </Badge>
        );
      default:
        return null;
    }
  };

  const scorePercentage = (testResults.score / 100) * 100;
  const passThreshold = 70; // Seuil de réussite par défaut

  // Analyser les réponses pour afficher des statistiques
  const testAnswers = testResults.test_answers as Record<string, any> || {};
  const totalQuestions = Object.keys(testAnswers).length;

  return (
    <div className="space-y-6">
      {/* Carte principale des résultats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Résultats du test de qualification
            </CardTitle>
            {getStatusBadge(candidateProfile?.qualification_status || testResults.qualification_status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Score obtenu</span>
              <span className="font-semibold">
                {testResults.score} / 100 points
              </span>
            </div>
            <Progress value={scorePercentage} className="h-3" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Seuil de réussite: {passThreshold}%
              </span>
              <span>100</span>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Questions répondues</p>
              <p className="text-lg font-semibold">{totalQuestions}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Taux de réussite</p>
              <p className="text-lg font-semibold">{Math.round(scorePercentage)}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Date du test</p>
              <p className="text-lg font-semibold">
                {new Date(testResults.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Message de statut */}
          <div className={`p-4 rounded-lg ${
            testResults.qualification_status === 'qualified' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-amber-50 border border-amber-200'
          }`}>
            {testResults.qualification_status === 'qualified' ? (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Félicitations !</p>
                  <p className="text-sm text-green-700 mt-1">
                    Vous avez réussi le test de qualification avec un score de {testResults.score}/100.
                    Vous êtes maintenant qualifié pour accéder aux missions.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Test en cours de validation</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Votre test est en cours de validation par notre équipe.
                    Vous serez notifié dès que le processus sera terminé.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Détails des réponses (optionnel) */}
      {totalQuestions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Détails du test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(testAnswers).map(([questionId, answer], index) => (
                <div key={questionId} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-gray-600">Question {index + 1}</span>
                  <Badge variant="outline" className="text-xs">
                    Réponse: {typeof answer === 'object' ? JSON.stringify(answer) : answer}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};