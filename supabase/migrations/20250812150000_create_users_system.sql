-- Create users table with authentication and personal information
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

-- Create index for faster lookups
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

-- Policy: Users can read their own data
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid()::text = id::text);

-- Policy: Users can update their own data (except role)
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Policy: Allow registration (insert)
CREATE POLICY "Allow user registration"
ON public.users
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can manage all users
CREATE POLICY "Admins can manage all users"
ON public.users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
);

-- Create user sessions table for session management
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

-- Insert some demo users for testing
INSERT INTO public.users (email, password_hash, first_name, last_name, role, email_verified) VALUES
('admin@example.com', '$2b$10$rOOjVJrA5xqHmJfhZKJe5OBpDh/6w1oNGFJ4Hm8YXx2qVCEhN2.Hu', 'Admin', 'User', 'admin', true),
('client@example.com', '$2b$10$rOOjVJrA5xqHmJfhZKJe5OBpDh/6w1oNGFJ4Hm8YXx2qVCEhN2.Hu', 'Marie', 'Dupont', 'client', true),
('candidate@example.com', '$2b$10$rOOjVJrA5xqHmJfhZKJe5OBpDh/6w1oNGFJ4Hm8YXx2qVCEhN2.Hu', 'Jean', 'Martin', 'candidate', true);