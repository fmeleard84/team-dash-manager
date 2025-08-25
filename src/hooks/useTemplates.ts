import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TemplateCategory, ProjectTemplate } from '@/types/templates';

export const useTemplates = () => {
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('template_categories')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        // If table doesn't exist, just set empty array
        if (error.code === '42P01') {
          console.log('Template categories table does not exist yet. Please create it first.');
          setCategories([]);
          return;
        }
        throw error;
      }
      setCategories(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching categories:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select(`
          *,
          category:template_categories(*)
        `)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        // If table doesn't exist, just set empty array
        if (error.code === 'PGRST200' || error.code === '42P01') {
          console.log('Project templates table does not exist yet. Please create it first.');
          setTemplates([]);
          return;
        }
        throw error;
      }
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching templates:', err);
    }
  };

  const getTemplatesByCategory = (categoryId: string) => {
    return templates.filter(template => template.category_id === categoryId);
  };

  const createProjectFromTemplate = async (templateId: string, projectData: {
    title: string;
    description?: string;
    project_date: string;
    due_date?: string;
    client_budget?: number;
  }) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: projectData.title,
          description: projectData.description,
          project_date: projectData.project_date,
          due_date: projectData.due_date,
          client_budget: projectData.client_budget,
          status: 'pause',
          template_id: templateId
        })
        .select('id')
        .single();

      if (projectError) throw projectError;

      // TODO: Create ReactFlow structure based on template.reactflow_data
      // This would integrate with your existing ReactFlow system

      return project;
    } catch (err: any) {
      setError(err.message);
      console.error('Error creating project from template:', err);
      throw err;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchTemplates()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    categories,
    templates,
    loading,
    error,
    getTemplatesByCategory,
    createProjectFromTemplate,
    refetch: () => Promise.all([fetchCategories(), fetchTemplates()])
  };
};