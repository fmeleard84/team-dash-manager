-- Create client_team_members table
CREATE TABLE IF NOT EXISTS public.client_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_billable BOOLEAN DEFAULT true,
  daily_rate DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for client_id
CREATE INDEX idx_client_team_members_client_id ON public.client_team_members(client_id);

-- Add unique constraint for email per client
CREATE UNIQUE INDEX idx_client_team_members_client_email ON public.client_team_members(client_id, email);

-- Add RLS policies
ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

-- Policy for clients to manage their own team members
CREATE POLICY "Clients can manage their own team members" ON public.client_team_members
  FOR ALL
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Policy for admin/HR to view all team members
CREATE POLICY "Admin can view all team members" ON public.client_team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'hr')
    )
  );

-- Update trigger for updated_at
CREATE TRIGGER update_client_team_members_updated_at
  BEFORE UPDATE ON public.client_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;