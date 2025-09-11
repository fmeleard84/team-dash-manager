-- Ajouter la colonne file_url si elle n'existe pas déjà
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'message_attachments' 
        AND column_name = 'file_url'
    ) THEN
        ALTER TABLE message_attachments ADD COLUMN file_url TEXT;
        
        -- Mettre à jour les enregistrements existants pour générer l'URL
        UPDATE message_attachments 
        SET file_url = 'https://egdelmcijszuapcpglsy.supabase.co/storage/v1/object/public/kanban-files/' || file_path
        WHERE file_url IS NULL;
        
        RAISE NOTICE 'Column file_url added to message_attachments table';
    ELSE
        RAISE NOTICE 'Column file_url already exists in message_attachments table';
    END IF;
END $$;