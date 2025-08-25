export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplate {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  reactflow_data: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: {
        label: string;
        role: string;
        skills: string[];
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
    }>;
  };
  estimated_duration?: number; // in days
  estimated_cost?: number; // in euros
  complexity_level: 'easy' | 'medium' | 'hard';
  tags?: string[];
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  category?: TemplateCategory;
}