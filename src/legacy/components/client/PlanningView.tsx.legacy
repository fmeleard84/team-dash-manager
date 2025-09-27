import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SharedPlanningView from "@/components/shared/SharedPlanningView";

interface Project { id: string; title: string }

export default function PlanningView() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("load projects error", error);
      } else {
        setProjects(data as Project[]);
      }
    })();
  }, []);

  return <SharedPlanningView mode="client" projects={projects} />;
}