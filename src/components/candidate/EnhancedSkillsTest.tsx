import React, { useState, useEffect } from 'react';
import { GraduationCap, CheckCircle, Clock, AlertCircle, ArrowLeft, ArrowRight, Zap, Trophy } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'rating' | 'open-ended';
  options?: string[];
  correctAnswer?: number | string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
}

interface TestProps {
  profileId: string;
  testAnswers: Record<number, any>;
  onAnswersChange: (answers: Record<number, any>, score: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

const EnhancedSkillsTest: React.FC<TestProps> = ({
  profileId,
  testAnswers,
  onAnswersChange,
  onNext,
  onPrev
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [isStarted, setIsStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Questions adaptées selon le profil
  const getQuestionsForProfile = (profileId: string): Question[] => {
    const commonQuestions: Question[] = [
      {
        id: 1,
        question: "Depuis combien de temps exercez-vous dans votre domaine professionnel ?",
        type: 'multiple-choice',
        options: ["Moins d'1 an", "1-2 ans", "3-5 ans", "5-10 ans", "Plus de 10 ans"],
        correctAnswer: 2, // 3-5 ans considéré comme optimal
        category: "Expérience",
        difficulty: 'beginner',
        points: 10
      },
      {
        id: 2,
        question: "Comment évaluez-vous votre capacité à travailler en équipe ?",
        type: 'rating',
        category: "Soft Skills",
        difficulty: 'beginner',
        points: 15
      },
      {
        id: 3,
        question: "Vous préférez travailler avec des deadlines serrés",
        type: 'true-false',
        category: "Adaptabilité",
        difficulty: 'intermediate',
        points: 10
      },
      {
        id: 4,
        question: "Décrivez brièvement votre plus grande réussite professionnelle",
        type: 'open-ended',
        category: "Expérience",
        difficulty: 'intermediate',
        points: 20
      }
    ];

    // Questions spécialisées selon le profil
    const techQuestions: Question[] = [
      {
        id: 5,
        question: "Quel est votre niveau en programmation ?",
        type: 'multiple-choice',
        options: ["Débutant", "Intermédiaire", "Avancé", "Expert"],
        correctAnswer: 1, // Intermédiaire considéré comme bon
        category: "Technique",
        difficulty: 'intermediate',
        points: 25
      },
      {
        id: 6,
        question: "Vous maîtrisez les concepts de l'architecture logicielle",
        type: 'true-false',
        category: "Technique",
        difficulty: 'advanced',
        points: 30
      }
    ];

    const designQuestions: Question[] = [
      {
        id: 5,
        question: "Quel outil de design utilisez-vous principalement ?",
        type: 'multiple-choice',
        options: ["Figma", "Adobe XD", "Sketch", "Adobe Creative Suite", "Autre"],
        correctAnswer: 0, // Figma est populaire
        category: "Outils",
        difficulty: 'beginner',
        points: 15
      },
      {
        id: 6,
        question: "Vous connaissez les principes UX/UI modernes",
        type: 'true-false',
        category: "Design",
        difficulty: 'intermediate',
        points: 25
      }
    ];

    const marketingQuestions: Question[] = [
      {
        id: 5,
        question: "Quelle est votre expérience avec les campagnes digitales ?",
        type: 'multiple-choice',
        options: ["Aucune", "Basique", "Intermédiaire", "Avancée", "Expert"],
        correctAnswer: 2, // Intermédiaire
        category: "Digital",
        difficulty: 'intermediate',
        points: 20
      },
      {
        id: 6,
        question: "Vous analysez régulièrement les KPIs de vos campagnes",
        type: 'true-false',
        category: "Analytique",
        difficulty: 'intermediate',
        points: 25
      }
    ];

    // Adapter selon le profil
    let specificQuestions: Question[] = [];
    if (profileId && profileId.includes('dev')) {
      specificQuestions = techQuestions;
    } else if (profileId && profileId.includes('design')) {
      specificQuestions = designQuestions;
    } else if (profileId && profileId.includes('marketing')) {
      specificQuestions = marketingQuestions;
    }

    return [...commonQuestions, ...specificQuestions];
  };

  const [questions] = useState(() => getQuestionsForProfile(profileId));

  // Timer
  useEffect(() => {
    if (isStarted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleFinishTest();
    }
  }, [isStarted, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId: number, answer: any) => {
    const newAnswers = { ...testAnswers, [questionId]: answer };
    const score = calculateScore(newAnswers);
    onAnswersChange(newAnswers, score);
  };

  const calculateScore = (answers: Record<number, any>) => {
    return questions.reduce((total, question) => {
      const answer = answers[question.id];
      if (!answer) return total;

      if (question.type === 'multiple-choice' || question.type === 'true-false') {
        return total + (answer === question.correctAnswer ? question.points : 0);
      } else if (question.type === 'rating') {
        // Rating 4-5 donne des points complets, 3 donne la moitié, etc.
        const ratingValue = parseInt(answer);
        if (ratingValue >= 4) return total + question.points;
        if (ratingValue === 3) return total + question.points * 0.5;
        return total;
      } else if (question.type === 'open-ended') {
        // Pour les questions ouvertes, on donne des points si il y a une réponse substantielle
        return total + (answer && answer.length > 20 ? question.points : 0);
      }
      return total;
    }, 0);
  };

  const handleFinishTest = () => {
    setShowResults(true);
  };

  const getScorePercentage = () => {
    const totalPossibleScore = questions.reduce((sum, q) => sum + q.points, 0);
    const currentScore = calculateScore(testAnswers);
    return Math.round((currentScore / totalPossibleScore) * 100);
  };

  const getScoreLevel = (percentage: number) => {
    if (percentage >= 80) return { level: 'Expert', color: 'text-green-600', icon: Trophy };
    if (percentage >= 60) return { level: 'Avancé', color: 'text-blue-600', icon: Zap };
    if (percentage >= 40) return { level: 'Intermédiaire', color: 'text-yellow-600', icon: CheckCircle };
    return { level: 'Débutant', color: 'text-gray-600', icon: AlertCircle };
  };

  if (!isStarted) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Test de Compétences
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Ce test évalue vos compétences techniques et professionnelles. 
            Il comporte {questions.length} questions et dure maximum 30 minutes.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Instructions :</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Répondez sincèrement à toutes les questions
            </li>
            <li className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Temps limité : 30 minutes
            </li>
            <li className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Une fois commencé, vous ne pourrez pas mettre en pause
            </li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onPrev}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <button
            onClick={() => setIsStarted(true)}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700"
          >
            Commencer le test
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const percentage = getScorePercentage();
    const scoreInfo = getScoreLevel(percentage);
    const ScoreIcon = scoreInfo.icon;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className={`w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto`}>
            <ScoreIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Test Terminé !
          </h2>
          <p className="text-gray-600">
            Voici vos résultats
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 text-center">
          <div className="text-4xl font-bold text-green-600 mb-2">{percentage}%</div>
          <div className={`text-lg font-semibold ${scoreInfo.color} mb-2`}>
            Niveau : {scoreInfo.level}
          </div>
          <div className="text-gray-600">
            Score : {calculateScore(testAnswers)} / {questions.reduce((sum, q) => sum + q.points, 0)} points
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-gray-600">Progression par catégorie :</div>
          {['Expérience', 'Technique', 'Soft Skills'].map(category => {
            const categoryQuestions = questions.filter(q => q.category === category);
            if (categoryQuestions.length === 0) return null;
            
            const categoryScore = categoryQuestions.reduce((sum, q) => {
              const answer = testAnswers[q.id];
              if (q.type === 'multiple-choice' && answer === q.correctAnswer) return sum + q.points;
              if (q.type === 'rating' && parseInt(answer) >= 4) return sum + q.points;
              if (q.type === 'open-ended' && answer && answer.length > 20) return sum + q.points;
              return sum;
            }, 0);
            const categoryMax = categoryQuestions.reduce((sum, q) => sum + q.points, 0);
            const categoryPercentage = Math.round((categoryScore / categoryMax) * 100);

            return (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                      style={{ width: `${categoryPercentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12">{categoryPercentage}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onPrev}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <button
            onClick={onNext}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 flex items-center gap-2"
          >
            Continuer
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header avec timer et progression */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Question {currentQuestion + 1} sur {questions.length}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg border p-6 space-y-6">
        <div className="space-y-2">
          <div className="text-xs text-indigo-600 font-medium uppercase tracking-wide">
            {currentQ.category} • {currentQ.difficulty}
          </div>
          <h3 className="text-xl font-semibold text-gray-800">
            {currentQ.question}
          </h3>
        </div>

        {/* Réponses selon le type */}
        {currentQ.type === 'multiple-choice' && (
          <div className="space-y-3">
            {currentQ.options?.map((option, index) => (
              <label key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${currentQ.id}`}
                  value={index}
                  checked={testAnswers[currentQ.id] === index}
                  onChange={() => handleAnswer(currentQ.id, index)}
                  className="text-indigo-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )}

        {currentQ.type === 'true-false' && (
          <div className="space-y-3">
            {['Vrai', 'Faux'].map((option, index) => (
              <label key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${currentQ.id}`}
                  value={index}
                  checked={testAnswers[currentQ.id] === index}
                  onChange={() => handleAnswer(currentQ.id, index)}
                  className="text-indigo-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )}

        {currentQ.type === 'rating' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">Évaluez de 1 (faible) à 5 (excellent)</div>
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((rating) => (
                <label key={rating} className="flex flex-col items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={rating}
                    checked={testAnswers[currentQ.id] === rating.toString()}
                    onChange={() => handleAnswer(currentQ.id, rating.toString())}
                    className="text-indigo-600"
                  />
                  <span className="text-sm">{rating}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {currentQ.type === 'open-ended' && (
          <textarea
            className="w-full p-3 border rounded-lg resize-none"
            rows={4}
            placeholder="Votre réponse..."
            value={testAnswers[currentQ.id] || ''}
            onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Précédent
        </button>
        
        {currentQuestion < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            disabled={!testAnswers[currentQ.id]}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Suivant
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFinishTest}
            disabled={!testAnswers[currentQ.id]}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Terminer
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default EnhancedSkillsTest;