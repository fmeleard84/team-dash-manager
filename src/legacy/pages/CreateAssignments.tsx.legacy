import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const CreateAssignments = () => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string }>({});

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data);
      console.log('Projects loaded:', data);
    }
  };

  const createAssignmentsForProject = async (projectId: string) => {
    setLoading(true);
    setResult({});

    try {
      // Get the project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      console.log('Project details:', project);

      // Check if hr_needs exists and has resources
      if (!project.hr_needs || !Array.isArray(project.hr_needs) || project.hr_needs.length === 0) {
        setResult({ 
          error: 'This project has no HR needs defined. Please add resources first.'
        });
        return;
      }

      // Create assignments for each resource in hr_needs
      const assignments = [];
      for (const resource of project.hr_needs) {
        if (resource.profile_id) {
          const assignment = {
            project_id: projectId,
            profile_id: resource.profile_id,
            seniority: resource.seniority || 'intermediate',
            languages: resource.languages || [],
            expertises: resource.expertises || [],
            booking_status: 'recherche',
            calculated_price: resource.price || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Creating assignment:', assignment);

          const { data, error } = await supabase
            .from('hr_resource_assignments')
            .insert(assignment)
            .select()
            .single();

          if (error) {
            console.error('Error creating assignment:', error);
            setResult({ 
              error: `Failed to create assignment: ${error.message}`
            });
          } else {
            assignments.push(data);
          }
        }
      }

      if (assignments.length > 0) {
        setResult({ 
          success: true,
          message: `Successfully created ${assignments.length} assignments for project "${project.title}"`
        });

        // Trigger notification sending
        console.log('Triggering notification for candidates...');
        const { data: notifResult, error: notifError } = await supabase.functions.invoke('resource-booking', {
          body: {
            action: 'find_candidates',
            projectId: projectId
          }
        });

        if (!notifError) {
          console.log('Notification result:', notifResult);
          setResult(prev => ({
            ...prev,
            message: `${prev.message}\n${notifResult?.message || 'Notifications sent to matching candidates.'}`
          }));
        }
      } else {
        setResult({ 
          error: 'No assignments were created. Check if resources have profile_id.'
        });
      }

    } catch (error: any) {
      console.error('Error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Missing HR Resource Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This tool creates hr_resource_assignments from project hr_needs. 
              Use this when "Booker l'équipe" didn't create assignments properly.
            </AlertDescription>
          </Alert>

          {result.success && (
            <Alert className="border-green-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="whitespace-pre-wrap">
                {result.message}
              </AlertDescription>
            </Alert>
          )}

          {result.error && (
            <Alert className="border-red-500">
              <AlertDescription className="whitespace-pre-wrap text-red-500">
                {result.error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold">Projects with HR Needs:</h3>
            {projects.map(project => (
              <Card key={project.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{project.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      HR Needs: {project.hr_needs?.length || 0} resources
                    </p>
                    {project.hr_needs && project.hr_needs.length > 0 && (
                      <div className="text-xs mt-1">
                        {project.hr_needs.map((need: any, idx: number) => (
                          <div key={idx}>
                            • {need.profile_name || 'Unknown'} - {need.seniority} 
                            {need.languages?.length > 0 && ` (${need.languages.join(', ')})`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => createAssignmentsForProject(project.id)}
                    disabled={loading || !project.hr_needs || project.hr_needs.length === 0}
                    size="sm"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Create Assignments'
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {projects.length === 0 && (
            <p className="text-center text-muted-foreground">No projects found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAssignments;