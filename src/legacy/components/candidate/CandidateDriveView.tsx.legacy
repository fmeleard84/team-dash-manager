import SharedDriveView from "../shared/SharedDriveView";
import { useCandidateProjectsOptimized } from "@/hooks/useCandidateProjectsOptimized";

export default function CandidateDriveView() {
  const { projects } = useCandidateProjectsOptimized();

  // Transform projects to match the expected interface
  const formattedProjects = projects.map(project => ({
    id: project.id,
    title: project.title
  }));

  return <SharedDriveView projects={formattedProjects} userType="candidate" />;
}