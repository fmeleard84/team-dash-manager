import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function cleanupDuplicateMessages() {
  console.log('🧹 Recherche des messages dupliqués...');

  try {
    // Récupérer tous les messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log(`📊 ${messages.length} messages trouvés au total`);

    // Regrouper par thread_id et content pour trouver les doublons
    const messageMap = new Map();
    const duplicates = [];

    for (const msg of messages) {
      // Clé unique basée sur thread_id, content et timestamp proche (1 seconde)
      const timestamp = new Date(msg.created_at).getTime();
      const roundedTimestamp = Math.floor(timestamp / 1000); // Arrondi à la seconde
      const key = `${msg.thread_id}-${msg.content}-${roundedTimestamp}-${msg.sender_id}`;

      if (messageMap.has(key)) {
        // C'est un doublon
        duplicates.push(msg.id);
        console.log(`🔄 Doublon détecté: ${msg.id} (thread: ${msg.thread_id})`);
      } else {
        messageMap.set(key, msg);
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ Aucun message dupliqué trouvé');
      return;
    }

    console.log(`🗑️ ${duplicates.length} messages dupliqués à supprimer`);

    // Supprimer les doublons
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .in('id', duplicates);

    if (deleteError) throw deleteError;

    console.log('✅ Messages dupliqués supprimés avec succès');

    // Afficher les statistiques
    const { data: remaining } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true });

    console.log(`📊 Messages restants: ${remaining}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le nettoyage
cleanupDuplicateMessages();