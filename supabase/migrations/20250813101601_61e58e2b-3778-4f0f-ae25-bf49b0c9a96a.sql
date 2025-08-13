-- Create Kanban tables with project binding and RLS

-- Tables
CREATE TABLE IF NOT EXISTS public.kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  members TEXT[] DEFAULT '{}',
  team_members JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT,
  "limit" INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  assigned_to_name TEXT,
  assigned_to_email TEXT,
  assigned_to_avatar TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
  labels TEXT[] DEFAULT '{}',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kanban_boards_project ON public.kanban_boards(project_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board ON public.kanban_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_position ON public.kanban_columns(position);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board ON public.kanban_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column ON public.kanban_cards(column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_position ON public.kanban_cards(position);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_kanban_boards_updated_at ON public.kanban_boards;
CREATE TRIGGER update_kanban_boards_updated_at
BEFORE UPDATE ON public.kanban_boards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_columns_updated_at ON public.kanban_columns;
CREATE TRIGGER update_kanban_columns_updated_at
BEFORE UPDATE ON public.kanban_columns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_cards_updated_at ON public.kanban_cards;
CREATE TRIGGER update_kanban_cards_updated_at
BEFORE UPDATE ON public.kanban_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies: project owners manage everything
DROP POLICY IF EXISTS "Owners manage kanban boards" ON public.kanban_boards;
CREATE POLICY "Owners manage kanban boards"
ON public.kanban_boards
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners manage kanban columns" ON public.kanban_columns;
CREATE POLICY "Owners manage kanban columns"
ON public.kanban_columns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.kanban_boards b
    JOIN public.projects p ON p.id = b.project_id
    WHERE b.id = board_id AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kanban_boards b
    JOIN public.projects p ON p.id = b.project_id
    WHERE b.id = board_id AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners manage kanban cards" ON public.kanban_cards;
CREATE POLICY "Owners manage kanban cards"
ON public.kanban_cards
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.kanban_boards b
    JOIN public.projects p ON p.id = b.project_id
    WHERE b.id = board_id AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kanban_boards b
    JOIN public.projects p ON p.id = b.project_id
    WHERE b.id = board_id AND p.owner_id = auth.uid()
  )
);
