import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QualificationTestProps {
  currentCandidateId: string;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correct_answer: number;
  points: number;
}

interface Test {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  passing_score: number;
  max_score: number;
  time_limit_minutes: number;
}

interface TestResult {
  id: string;
  test_id: string;
  score: number;
  max_score: number;
  status: 'pending' | 'passed' | 'failed' | 'in_progress';
  completed_at: string;
}

export const QualificationTest = ({ currentCandidateId }: QualificationTestProps) => {
  const [currentTest, setCurrentTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isStarted, setIsStarted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Early return if no candidateId
  if (!currentCandidateId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Chargement du profil candidat...</p>
        </CardContent>
      </Card>
    );
  }

  // Fetch candidate profile to get profile_id
  const { data: candidateProfile } = useQuery({
    queryKey: ['candidateProfile', currentCandidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('profile_id')
        .eq('id', currentCandidateId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCandidateId
  });

  // Fetch available tests based on candidate's profile
  const { data: availableTests } = useQuery({
    queryKey: ['qualificationTests', candidateProfile?.profile_id],
    queryFn: async () => {
      if (!candidateProfile?.profile_id) return [];
      
      const { data, error } = await supabase
        .from('hr_qualification_tests')
        .select('*')
        .eq('profile_id', candidateProfile.profile_id)
        .eq('is_active', true);
      
      if (error) throw error;
      return (data || []).map(test => ({
        ...test,
        questions: (test.questions as unknown) as Question[]
      })) as Test[];
    },
    enabled: !!candidateProfile?.profile_id
  });

  // Fetch candidate's test results
  const { data: testResults } = useQuery({
    queryKey: ['qualificationResults', currentCandidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_qualification_results')
        .select('*')
        .eq('candidate_id', currentCandidateId);
      
      if (error) throw error;
      return data as TestResult[];
    },
    enabled: !!currentCandidateId
  });

  // Submit test mutation
  const submitTestMutation = useMutation({
    mutationFn: async ({ testId, score, answers: testAnswers }: { testId: string; score: number; answers: any }) => {
      const status = score >= (currentTest?.passing_score || 70) ? 'passed' : 'failed';
      
      const { error } = await supabase
        .from('candidate_qualification_results')
        .upsert({
          candidate_id: currentCandidateId,
          test_id: testId,
          score,
          max_score: currentTest?.max_score || 100,
          status,
          answers: testAnswers,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update candidate qualification status if passed
      if (status === 'passed') {
        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update({ qualification_status: 'qualified' })
          .eq('id', currentCandidateId);
        
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualificationResults'] });
      toast({
        title: "Test terminé",
        description: "Votre test a été soumis avec succès."
      });
      setCurrentTest(null);
      setIsStarted(false);
      setAnswers({});
    }
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStarted && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStarted, timeLeft]);

  const startTest = (test: Test) => {
    setCurrentTest(test);
    setTimeLeft(test.time_limit_minutes * 60);
    setIsStarted(true);
    setAnswers({});
  };

  const handleSubmitTest = () => {
    if (!currentTest) return;

    let score = 0;
    currentTest.questions.forEach((question) => {
      if (answers[question.id] === question.correct_answer) {
        score += question.points;
      }
    });

    submitTestMutation.mutate({
      testId: currentTest.id,
      score,
      answers: answers
    });
  };

  const getResultBadgeColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'in_progress': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getResultIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isStarted && currentTest) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">{currentTest.name}</h3>
          <div className="flex items-center gap-2 text-lg font-mono">
            <Clock className="h-5 w-5" />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        <div className="space-y-6">
          {currentTest.questions.map((question) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  Question {question.id} ({question.points} points)
                </CardTitle>
                <p>{question.question}</p>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[question.id]?.toString()}
                  onValueChange={(value) => 
                    setAnswers(prev => ({ ...prev, [question.id]: parseInt(value) }))
                  }
                >
                  {question.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={index.toString()} id={`q${question.id}-${index}`} />
                      <Label htmlFor={`q${question.id}-${index}`}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          onClick={handleSubmitTest} 
          className="w-full"
          disabled={Object.keys(answers).length !== currentTest.questions.length}
        >
          Terminer le test
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Tests de qualification</h3>
        <p className="text-muted-foreground">
          Complétez les tests de qualification pour valider vos compétences et recevoir des projets.
        </p>
      </div>

      {/* Test Results */}
      {testResults && testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mes résultats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result) => {
                const test = availableTests?.find(t => t.id === result.test_id);
                return (
                  <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{test?.name || 'Test inconnu'}</h4>
                      <p className="text-sm text-muted-foreground">
                        Score: {result.score}/{result.max_score}
                      </p>
                    </div>
                    <Badge className={`text-white ${getResultBadgeColor(result.status)}`}>
                      {getResultIcon(result.status)}
                      <span className="ml-1 capitalize">{result.status}</span>
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Tests */}
      <div className="space-y-4">
        {availableTests?.map((test) => {
          const hasResult = testResults?.find(r => r.test_id === test.id);
          const canRetake = hasResult?.status === 'failed' || !hasResult;

          return (
            <Card key={test.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {test.name}
                  {hasResult && (
                    <Badge className={`text-white ${getResultBadgeColor(hasResult.status)}`}>
                      {getResultIcon(hasResult.status)}
                      <span className="ml-1 capitalize">{hasResult.status}</span>
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-muted-foreground">{test.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Questions: {test.questions.length}</p>
                  <p>Score requis: {test.passing_score}%</p>
                  <p>Durée: {test.time_limit_minutes} minutes</p>
                </div>
                {canRetake && (
                  <Button 
                    onClick={() => startTest(test)} 
                    className="mt-4 w-full"
                  >
                    {hasResult ? 'Repasser le test' : 'Commencer le test'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!availableTests || availableTests.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun test de qualification disponible pour votre profil.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};