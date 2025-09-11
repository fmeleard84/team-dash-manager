-- Ajouter la colonne file_url à la table message_attachments si elle n'existe pas
ALTER TABLE message_attachments 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Mettre à jour les enregistrements existants pour générer l'URL
UPDATE message_attachments 
SET file_url = 'https://egdelmcijszuapcpglsy.supabase.co/storage/v1/object/public/kanban-files/' || file_path
WHERE file_url IS NULL AND file_path IS NOT NULL;

-- Ajouter un commentaire pour documenter cette colonne
COMMENT ON COLUMN message_attachments.file_url IS 'URL publique pour accéder directement au fichier';