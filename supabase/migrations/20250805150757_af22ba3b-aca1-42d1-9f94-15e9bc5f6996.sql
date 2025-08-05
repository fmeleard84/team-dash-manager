-- Create profile types enum
CREATE TYPE profile_type AS ENUM ('client', 'resource');

-- Update candidate_profiles table to include profile_type
ALTER TABLE candidate_profiles 
ADD COLUMN profile_type profile_type DEFAULT 'resource';

-- Create a table for clients
CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keycloak_user_id TEXT,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on client_profiles
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for client_profiles
CREATE POLICY "Clients can view their own profile" 
ON client_profiles 
FOR SELECT 
USING (email = ((current_setting('request.jwt.claims', true))::json ->> 'email'));

CREATE POLICY "Clients can update their own profile" 
ON client_profiles 
FOR UPDATE 
USING (email = ((current_setting('request.jwt.claims', true))::json ->> 'email'));

CREATE POLICY "Anyone can create client profile" 
ON client_profiles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all client profiles" 
ON client_profiles 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_client_profiles_updated_at
BEFORE UPDATE ON client_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();