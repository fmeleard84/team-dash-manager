#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function applyPhoneSync() {
  console.log('🔧 Invocation de la fonction apply-phone-sync...');
  
  const response = await fetch('https://egdelmcijszuapcpglsy.supabase.co/functions/v1/apply-phone-sync', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log('📱 Réponse:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('✅ Synchronisation des téléphones appliquée avec succès !');
    console.log(`📊 ${data.updatedCount} candidats ont maintenant leur téléphone synchronisé.`);
  } else {
    console.error('❌ Erreur:', data.error);
  }
}

applyPhoneSync().catch(console.error);