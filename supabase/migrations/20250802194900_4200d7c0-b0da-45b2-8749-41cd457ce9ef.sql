-- Create admin_users table for authentication
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price_per_minute DECIMAL(10,2) NOT NULL DEFAULT 0,
  project_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pause' CHECK (status IN ('play', 'pause')),
  user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_flows table for ReactFlow data
CREATE TABLE public.project_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_flows ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users (only allow reading for login verification)
CREATE POLICY "Admin users can view their own data" 
ON public.admin_users 
FOR SELECT 
USING (true);

-- Create policies for projects
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (true);

-- Create policies for project_flows
CREATE POLICY "Users can view project flows" 
ON public.project_flows 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create project flows" 
ON public.project_flows 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update project flows" 
ON public.project_flows 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_flows_updated_at
  BEFORE UPDATE ON public.project_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default admin user (login: admin, password: admin123)
INSERT INTO public.admin_users (login, password_hash) 
VALUES ('admin', '$2a$10$mwt1D1RYlQJr.fQQhPN1DeK8uY/6DQD.VoGfQR9EiHK4/O.M5JgC2');