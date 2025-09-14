import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Briefcase } from "lucide-react";

interface SeniorityStepProps {
  seniority: string;
  onSeniorityChange: (seniority: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

const seniorityLevels = [
  {
    value: 'junior',
    label: 'Junior',
    description: '0-3 ans d\'expérience',
    details: 'Débutant ou peu d\'expérience dans le domaine'
  },
  {
    value: 'intermediate',
    label: 'Intermédiaire',
    description: '3-7 ans d\'expérience',
    details: 'Expérience solide et autonomie sur les projets'
  },
  {
    value: 'senior',
    label: 'Senior / Expert',
    description: 'Plus de 7 ans d\'expérience',
    details: 'Expert technique avec capacité de mentorat et vision stratégique'
  }
];

export const SeniorityStep = ({
  seniority,
  onSeniorityChange,
  onNext,
  onPrev
}: SeniorityStepProps) => {
  return (
    <Card className="w-full max-w-2xl mx-auto border-border">
      <CardHeader>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl text-foreground">
              Niveau de séniorité
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Indiquez votre niveau d'expérience professionnelle
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={seniority}
          onValueChange={onSeniorityChange}
          className="space-y-4"
        >
          {seniorityLevels.map((level) => (
            <div
              key={level.value}
              className={`relative flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50 hover:bg-accent ${
                seniority === level.value
                  ? 'border-primary bg-accent'
                  : 'border-border'
              }`}
              onClick={() => onSeniorityChange(level.value)}
            >
              <RadioGroupItem
                value={level.value}
                id={level.value}
                className="mt-1"
              />
              <Label
                htmlFor={level.value}
                className="flex-1 cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {level.label}
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {level.description}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {level.details}
                </p>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-between pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={onPrev}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </Button>
          <Button
            onClick={onNext}
            disabled={!seniority}
            className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};