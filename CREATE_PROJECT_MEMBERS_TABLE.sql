-- ================================================
-- CREATE PROJECT MEMBERS TABLE
-- ================================================
-- This table stores all members of a project (owner and team members)
-- ================================================

-- Create the project_members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- RLS Policies
CREATE POLICY "Users can view members of their projects" ON project_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage members" ON project_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Function to populate project_members from existing data
CREATE OR REPLACE FUNCTION populate_project_members()
RETURNS void AS $$
BEGIN
  -- Insert project owners from projects table
  INSERT INTO project_members (project_id, user_id, role)
  SELECT 
    p.id as project_id,
    COALESCE(p.owner_id, p.user_id) as user_id,
    'owner' as role
  FROM projects p
  WHERE COALESCE(p.owner_id, p.user_id) IS NOT NULL
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- Insert team members from hr_resource_assignments
  INSERT INTO project_members (project_id, user_id, role)
  SELECT DISTINCT
    hra.project_id,
    cp.user_id,
    'member' as role
  FROM hr_resource_assignments hra
  JOIN candidate_profiles cp ON cp.id = hra.candidate_id
  WHERE hra.status IN ('active', 'confirmed', 'accepted')
  AND cp.user_id IS NOT NULL
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- Also check project_bookings
  INSERT INTO project_members (project_id, user_id, role)
  SELECT DISTINCT
    pb.project_id,
    p.user_id,
    'member' as role
  FROM project_bookings pb
  JOIN profiles p ON p.id = pb.candidate_id
  WHERE pb.status IN ('accepted', 'confirmed')
  AND p.user_id IS NOT NULL
  ON CONFLICT (project_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Run the population function
SELECT populate_project_members();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE project_members;

-- Verify the data
SELECT 
  pm.*,
  p.first_name,
  p.last_name,
  p.email
FROM project_members pm
JOIN profiles p ON p.user_id = pm.user_id
ORDER BY pm.project_id, pm.role;