import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy, Award, Star, Target, TrendingUp,
  CheckCircle, XCircle, Clock, ArrowRight,
  Download, Share2, RefreshCw, Home
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

interface TestResult {
  score: number;
  status: 'validated' | 'stand_by' | 'rejected';
  answers: Array<{
    questionId: string;
    userAnswer: string;
    score: number;
    feedback?: string;
  }>;
}

interface TestResultsDisplayProps {
  result: TestResult;
  candidateName?: string;
  profileName?: string;
  onRetry?: () => void;
  onGoToDashboard?: () => void;
  onDownloadCertificate?: () => void;
  onShare?: () => void;
}

export const TestResultsDisplay = ({
  result,
  candidateName = 'Candidat',
  profileName = 'Métier',
  onRetry,
  onGoToDashboard,
  onDownloadCertificate,
  onShare
}: TestResultsDisplayProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Lancer les confettis si validé
  useEffect(() => {
    if (result.status === 'validated' && !animationComplete) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ec4899', '#3b82f6']
        });
        setAnimationComplete(true);
      }, 500);
    }
  }, [result.status, animationComplete]);

  // Calculer les statistiques
  const technicalQuestions = result.answers.filter((_, i) => i % 2 === 0);
  const softSkillQuestions = result.answers.filter((_, i) => i % 2 === 1);
  const technicalScore = technicalQuestions.reduce((sum, a) => sum + a.score, 0) / technicalQuestions.length;
  const softSkillScore = softSkillQuestions.reduce((sum, a) => sum + a.score, 0) / softSkillQuestions.length;

  // Configuration selon le statut
  const statusConfig = {
    validated: {
      icon: Trophy,
      title: '🎉 Félicitations, vous êtes qualifié !',
      subtitle: 'Votre profil est maintenant validé et visible des recruteurs',
      color: 'from-green-500 to-emerald-500',
      borderColor: 'border-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30'
    },
    stand_by: {
      icon: Clock,
      title: '⏳ Résultat en attente de validation',
      subtitle: 'Un expert va examiner vos réponses sous 24-48h',
      color: 'from-yellow-500 to-orange-500',
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30'
    },
    rejected: {
      icon: RefreshCw,
      title: '💪 Continuez vos efforts !',
      subtitle: 'Vous pourrez repasser le test dans 24 heures',
      color: 'from-gray-500 to-gray-600',
      borderColor: 'border-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-950/30'
    }
  };

  const config = statusConfig[result.status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto p-6 space-y-6"
    >
      {/* Header avec résultat principal */}
      <Card className={cn(
        'relative overflow-hidden border-2',
        config.borderColor,
        config.bgColor
      )}>
        <div className={cn(
          'absolute inset-0 opacity-10 bg-gradient-to-br',
          config.color
        )} />

        <div className="relative p-8 text-center space-y-4">
          {/* Icône animée */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="inline-flex"
          >
            <div className={cn(
              'w-24 h-24 rounded-full flex items-center justify-center',
              'bg-gradient-to-br text-white shadow-xl',
              config.color
            )}>
              <Icon className="w-12 h-12" />
            </div>
          </motion.div>

          {/* Titre et sous-titre */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {config.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {config.subtitle}
            </p>
          </div>

          {/* Score principal */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
            className="py-6"
          >
            <div className="text-6xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 text-transparent bg-clip-text">
              {result.score}%
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Score final
            </div>
          </motion.div>

          {/* Barre de progression colorée */}
          <div className="w-full max-w-md mx-auto">
            <Progress
              value={result.score}
              className="h-4"
              style={{
                background: `linear-gradient(to right,
                  ${result.score < 60 ? '#ef4444' :
                    result.score < 90 ? '#f59e0b' : '#10b981'}
                  ${result.score}%,
                  #e5e7eb ${result.score}%)`
              }}
            />
          </div>
        </div>
      </Card>

      {/* Statistiques détaillées */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Compétences techniques */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Compétences Techniques</h3>
            </div>
            <Badge variant="secondary">
              {technicalScore.toFixed(1)}/10
            </Badge>
          </div>
          <Progress value={technicalScore * 10} className="h-2" />
          <p className="text-sm text-gray-500 mt-2">
            {technicalScore >= 7 ? 'Excellent niveau' :
             technicalScore >= 5 ? 'Bon niveau' : 'À améliorer'}
          </p>
        </Card>

        {/* Soft skills */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">Soft Skills</h3>
            </div>
            <Badge variant="secondary">
              {softSkillScore.toFixed(1)}/10
            </Badge>
          </div>
          <Progress value={softSkillScore * 10} className="h-2" />
          <p className="text-sm text-gray-500 mt-2">
            {softSkillScore >= 7 ? 'Excellentes qualités' :
             softSkillScore >= 5 ? 'Bonnes qualités' : 'À développer'}
          </p>
        </Card>
      </div>

      {/* Détail des réponses (optionnel) */}
      {showDetails && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Détail de vos réponses
          </h3>
          <div className="space-y-3">
            {result.answers.map((answer, index) => (
              <div key={answer.questionId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={index % 2 === 0 ? "default" : "secondary"}>
                    Q{index + 1}
                  </Badge>
                  <span className="text-sm">
                    {index % 2 === 0 ? 'Technique' : 'Soft Skill'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {answer.score >= 7 ?
                    <CheckCircle className="w-4 h-4 text-green-500" /> :
                    answer.score >= 5 ?
                    <Clock className="w-4 h-4 text-yellow-500" /> :
                    <XCircle className="w-4 h-4 text-red-500" />
                  }
                  <span className="font-semibold">{answer.score}/10</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {result.status === 'validated' && (
          <>
            <Button
              onClick={onDownloadCertificate}
              className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger le certificat
            </Button>
            <Button
              variant="outline"
              onClick={onShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
          </>
        )}

        {result.status === 'rejected' && (
          <Button
            onClick={onRetry}
            disabled={true}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Repasser dans 24h
          </Button>
        )}

        <Button
          onClick={() => setShowDetails(!showDetails)}
          variant="outline"
        >
          {showDetails ? 'Masquer' : 'Voir'} le détail
        </Button>

        <Button
          onClick={onGoToDashboard}
          className="bg-gradient-to-r from-gray-600 to-gray-700 text-white"
        >
          <Home className="w-4 h-4 mr-2" />
          Retour au tableau de bord
        </Button>
      </div>
    </motion.div>
  );
};