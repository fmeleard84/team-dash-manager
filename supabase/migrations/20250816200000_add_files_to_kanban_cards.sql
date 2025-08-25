-- Add files column to kanban_cards table
ALTER TABLE public.kanban_cards 
ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.kanban_cards.files IS 'Array of uploaded files metadata for the card';