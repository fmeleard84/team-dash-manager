import { useCandidateProjects } from "@/hooks/useCandidateProjects";
import SharedPlanningView from "@/components/shared/SharedPlanningView";

export default function CandidatePlanningView() {
  const { projects, candidateId } = useCandidateProjects();

  return <SharedPlanningView mode="candidate" projects={projects} candidateId={candidateId} />;
}