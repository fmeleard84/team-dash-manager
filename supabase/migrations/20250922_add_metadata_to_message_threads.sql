-- Ajouter la colonne metadata à message_threads si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'message_threads'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.message_threads
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

    -- Créer un index sur metadata pour les performances
    CREATE INDEX IF NOT EXISTS idx_message_threads_metadata
    ON message_threads USING gin(metadata);

    RAISE NOTICE 'Column metadata added to message_threads table';
  ELSE
    RAISE NOTICE 'Column metadata already exists in message_threads table';
  END IF;
END $$;

-- Ajouter aussi la colonne metadata à messages si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'messages'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.messages
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

    -- Créer un index sur metadata pour les performances
    CREATE INDEX IF NOT EXISTS idx_messages_metadata
    ON messages USING gin(metadata);

    RAISE NOTICE 'Column metadata added to messages table';
  ELSE
    RAISE NOTICE 'Column metadata already exists in messages table';
  END IF;
END $$;

-- Mettre à jour les threads existants pour avoir un type
UPDATE message_threads
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{type}',
  '"team"'::jsonb
)
WHERE metadata IS NULL
   OR metadata->>'type' IS NULL
   OR metadata->>'type' = '';

-- Marquer les threads contenant "Conversation privée" comme privés
UPDATE message_threads
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{type}',
  '"private"'::jsonb
)
WHERE title LIKE '%Conversation privée%';