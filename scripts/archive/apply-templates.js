import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

const applySql = async () => {
  try {
    console.log('Creating template categories...');
    
    // Create template_categories table
    const { error: categoriesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS template_categories (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          name varchar(255) NOT NULL,
          description text,
          icon varchar(100),
          color varchar(50),
          order_index integer DEFAULT 0,
          created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    });
    
    if (categoriesError) {
      console.error('Error creating categories table:', categoriesError);
      return;
    }
    
    console.log('Template categories table created successfully');
    
    // Create project_templates table
    const { error: templatesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS project_templates (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          category_id uuid REFERENCES template_categories(id) ON DELETE CASCADE,
          name varchar(255) NOT NULL,
          description text,
          reactflow_data jsonb NOT NULL,
          estimated_duration integer,
          estimated_cost integer,
          complexity_level varchar(20) DEFAULT 'medium',
          tags text[],
          is_active boolean DEFAULT true,
          order_index integer DEFAULT 0,
          created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    });
    
    if (templatesError) {
      console.error('Error creating templates table:', templatesError);
      return;
    }
    
    console.log('Project templates table created successfully');
    console.log('Template system setup complete!');
    
  } catch (error) {
    console.error('Error applying SQL:', error);
  }
};

applySql();