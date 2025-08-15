import { useCandidateProjectsOptimized } from "@/hooks/useCandidateProjectsOptimized";
import SharedPlanningView from "@/components/shared/SharedPlanningView";

export default function CandidatePlanningView() {
  const { projects, candidateId } = useCandidateProjectsOptimized();

  return <SharedPlanningView mode="candidate" projects={projects} candidateId={candidateId} />;
}