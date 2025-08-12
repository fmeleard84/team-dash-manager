
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types for TypeScript
export type Database = {
  public: {
    Tables: {
      kanban_boards: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          members: string[];
          team_members: any; // JSON field
          project_id: string | null; // NEW: project binding
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          members?: string[];
          team_members?: any;
          project_id?: string; // NEW: project binding
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          members?: string[];
          team_members?: any;
          project_id?: string; // NEW: project binding
        };
      };
      kanban_columns: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          position: number;
          color: string | null;
          limit: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          title: string;
          position: number;
          color?: string | null;
          limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          title?: string;
          position?: number;
          color?: string | null;
          limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      kanban_cards: {
        Row: {
          id: string;
          board_id: string;
          column_id: string;
          title: string;
          description: string | null;
          assigned_to: string | null;
          assigned_to_name: string | null;
          assigned_to_email: string | null;
          assigned_to_avatar: string | null;
          due_date: string | null;
          priority: 'low' | 'medium' | 'high';
          status: 'todo' | 'in_progress' | 'review' | 'done';
          labels: string[];
          progress: number;
          position: number;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          column_id: string;
          title: string;
          description?: string | null;
          assigned_to?: string | null;
          assigned_to_name?: string | null;
          assigned_to_email?: string | null;
          assigned_to_avatar?: string | null;
          due_date?: string | null;
          priority?: 'low' | 'medium' | 'high';
          status?: 'todo' | 'in_progress' | 'review' | 'done';
          labels?: string[];
          progress?: number;
          position: number;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          column_id?: string;
          title?: string;
          description?: string | null;
          assigned_to?: string | null;
          assigned_to_name?: string | null;
          assigned_to_email?: string | null;
          assigned_to_avatar?: string | null;
          due_date?: string | null;
          priority?: 'low' | 'medium' | 'high';
          status?: 'todo' | 'in_progress' | 'review' | 'done';
          labels?: string[];
          progress?: number;
          position?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
    };
  };
};
