/**
 * Module ONBOARDING - Composant SeniorityStep
 *
 * Composant temporaire pour l'étape de sélection de séniorité
 * dans le processus d'onboarding.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Button } from "@/ui/components/button";

interface SeniorityStepProps {
  selectedSeniority?: string;
  onSeniorityChange?: (seniority: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const seniorityOptions = [
  { value: 'junior', label: 'Junior', description: '0-2 ans d\'expérience' },
  { value: 'confirmé', label: 'Confirmé', description: '2-5 ans d\'expérience' },
  { value: 'senior', label: 'Senior', description: '5-10 ans d\'expérience' },
  { value: 'expert', label: 'Expert', description: '10+ ans d\'expérience' }
];

export function SeniorityStep({
  selectedSeniority,
  onSeniorityChange,
  onNext,
  onPrevious
}: SeniorityStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Quel est votre niveau d'expérience ?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sélectionnez votre niveau de séniorité pour mieux correspondre aux projets
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {seniorityOptions.map((option) => (
          <Card
            key={option.value}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedSeniority === option.value
                ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-950'
                : 'hover:shadow-md'
            }`}
            onClick={() => onSeniorityChange?.(option.value)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{option.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {option.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrevious}>
          Précédent
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedSeniority}
          className="min-w-[100px]"
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}

export default SeniorityStep;