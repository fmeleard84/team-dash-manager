-- Create task_ratings table
CREATE TABLE IF NOT EXISTS task_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  project_id UUID NOT NULL,
  candidate_id UUID,
  client_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, client_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_ratings_task_id ON task_ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_task_ratings_candidate_id ON task_ratings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_task_ratings_project_id ON task_ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_task_ratings_client_id ON task_ratings(client_id);

-- Enable RLS
ALTER TABLE task_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "task_ratings_select_policy" ON task_ratings;
DROP POLICY IF EXISTS "task_ratings_insert_policy" ON task_ratings;
DROP POLICY IF EXISTS "task_ratings_update_policy" ON task_ratings;

-- Allow all authenticated users to view ratings
CREATE POLICY "task_ratings_select_policy"
  ON task_ratings FOR SELECT
  USING (true);

-- Allow authenticated users to insert ratings
CREATE POLICY "task_ratings_insert_policy"
  ON task_ratings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = client_id);

-- Allow users to update their own ratings
CREATE POLICY "task_ratings_update_policy"
  ON task_ratings FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);