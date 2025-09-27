import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SharedDriveView from "../shared/SharedDriveView";

interface Project { 
  id: string; 
  title: string; 
}

export default function DriveView() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.profile?.id) return;

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title, status')
          .eq('owner_id', user.profile.id)
          .eq('status', 'play')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error('Error fetching client projects:', error);
      }
    };

    fetchProjects();
  }, [user?.profile?.id]);

  return <SharedDriveView projects={projects} userType="client" />;
}