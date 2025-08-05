-- Add Keycloak user ID support to existing tables
ALTER TABLE admin_users ADD COLUMN keycloak_user_id text UNIQUE;
ALTER TABLE candidate_profiles ADD COLUMN keycloak_user_id text UNIQUE;

-- Create a new users table for general user management with Keycloak
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keycloak_user_id text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (keycloak_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

CREATE POLICY "Admins can manage all users" 
ON public.users 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::json ->> 'groups'::text)::text[] && ARRAY['admin']);

-- Create project groups table for Keycloak group management
CREATE TABLE public.project_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keycloak_group_id text NOT NULL,
  keycloak_group_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable RLS on project_groups
ALTER TABLE public.project_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for project_groups
CREATE POLICY "Admins can manage project groups" 
ON public.project_groups 
FOR ALL 
USING (true);

-- Add trigger for updated_at on users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();