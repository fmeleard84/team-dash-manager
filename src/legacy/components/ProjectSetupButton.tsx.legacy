import { Button } from "@/components/ui/button";
import { useProjectOrchestrator } from "@/hooks/useProjectOrchestrator";
import { Rocket, Loader2 } from "lucide-react";

interface ProjectSetupButtonProps {
  projectId: string;
  projectTitle: string;
  onSetupComplete?: () => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
}

export const ProjectSetupButton = ({ 
  projectId, 
  projectTitle, 
  onSetupComplete,
  size = "default",
  variant = "default"
}: ProjectSetupButtonProps) => {
  const { setupProject, isLoading } = useProjectOrchestrator();

  const handleSetup = async () => {
    const success = await setupProject(projectId);
    if (success) {
      onSetupComplete?.();
    }
  };

  return (
    <Button 
      onClick={handleSetup} 
      disabled={isLoading}
      size={size}
      variant={variant}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Rocket className="w-4 h-4" />
      )}
      {isLoading ? "Configuration..." : "Configurer le projet"}
    </Button>
  );
};