import { EnhancedMessageSystemNeon } from "@/components/shared/EnhancedMessageSystemNeon";
import { useCandidateIdentity } from "@/hooks/useCandidateIdentity";

interface CandidateMessagesViewProps {
  projects: any[];
}

export default function CandidateMessagesView({ projects }: CandidateMessagesViewProps) {
  const { candidateId } = useCandidateIdentity();

  // Si un seul projet est passé, l'utiliser directement
  if (!projects || projects.length === 0) {
    return null;
  }

  const selectedProject = projects[0];

  return (
    <EnhancedMessageSystemNeon
      projectId={selectedProject.id}
      userRole="candidate"
      userId={candidateId || ''}
    />
  );
}