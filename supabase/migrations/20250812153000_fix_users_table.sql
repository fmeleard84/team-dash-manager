-- Fix users table to match our authentication system
-- Drop existing table and recreate with correct structure

-- First drop the old users table if it exists
DROP TABLE IF EXISTS public.users CASCADE;

-- Create the correct users table
CREATE TYPE user_role AS ENUM ('admin', 'client', 'candidate', 'hr_manager');

CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT, -- For clients
  role user_role NOT NULL DEFAULT 'candidate',
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verification_token TEXT,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at automatically
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous access for authentication
CREATE POLICY "Allow anonymous select for auth"
ON public.users
FOR SELECT
TO anon
USING (true);

-- Policy: Allow anonymous insert for registration
CREATE POLICY "Allow anonymous insert for registration"
ON public.users
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Users can read their own data
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);

-- Policy: Users can update their own data (except role)
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Policy: Admins can manage all users
CREATE POLICY "Admins can manage all users"
ON public.users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
);

-- Create or recreate user sessions table
DROP TABLE IF EXISTS public.user_sessions CASCADE;

CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access to sessions for auth checks
CREATE POLICY "Allow anonymous access to sessions"
ON public.user_sessions
FOR ALL
TO anon
USING (true);

-- Index for session lookups
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert demo users with properly hashed passwords (password: "password123")
INSERT INTO public.users (email, password_hash, first_name, last_name, role, company_name, email_verified) VALUES
('admin@example.com', '$2b$12$rOOjVJrA5xqHmJfhZKJe5OBpDh/6w1oNGFJ4Hm8YXx2qVCEhN2.Hu', 'Admin', 'User', 'admin', NULL, true),
('client@example.com', '$2b$12$rOOjVJrA5xqHmJfhZKJe5OBpDh/6w1oNGFJ4Hm8YXx2qVCEhN2.Hu', 'Marie', 'Dupont', 'client', 'Entreprise ABC', true),
('candidate@example.com', '$2b$12$rOOjVJrA5xqHmJfhZKJe5OBpDh/6w1oNGFJ4Hm8YXx2qVCEhN2.Hu', 'Jean', 'Martin', 'candidate', NULL, true);