import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Appliquer la migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Fonction pour notifier les changements de FAQ
        CREATE OR REPLACE FUNCTION notify_faq_changes()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Notifier pour synchronisation
          PERFORM pg_notify('faq_changes', json_build_object(
            'action', TG_OP,
            'faq_id', COALESCE(NEW.id, OLD.id),
            'is_active', COALESCE(NEW.is_active, FALSE)
          )::text);
          
          RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql;

        -- Trigger pour capturer les changements sur ai_faq
        DROP TRIGGER IF EXISTS trigger_faq_changes ON ai_faq;
        CREATE TRIGGER trigger_faq_changes
          AFTER INSERT OR UPDATE OR DELETE ON ai_faq
          FOR EACH ROW
          EXECUTE FUNCTION notify_faq_changes();

        -- Table pour stocker la queue de synchronisation
        CREATE TABLE IF NOT EXISTS sync_queue (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          action TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          processed_at TIMESTAMPTZ,
          error_message TEXT
        );

        -- Index pour la queue
        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);

        -- Fonction pour ajouter à la queue de synchronisation
        CREATE OR REPLACE FUNCTION add_to_sync_queue()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO sync_queue (table_name, record_id, action)
          VALUES ('ai_faq', COALESCE(NEW.id, OLD.id)::text, TG_OP);
          
          RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql;

        -- Trigger pour ajouter à la queue
        DROP TRIGGER IF EXISTS trigger_faq_sync_queue ON ai_faq;
        CREATE TRIGGER trigger_faq_sync_queue
          AFTER INSERT OR UPDATE OR DELETE ON ai_faq
          FOR EACH ROW
          EXECUTE FUNCTION add_to_sync_queue();

        -- Ajouter une colonne pour suivre la dernière synchronisation
        ALTER TABLE ai_faq ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
      `
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'FAQ sync migration applied successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});