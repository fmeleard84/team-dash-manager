#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTTS() {
  console.log('🔍 Test TTS via Edge Function...\n');
  
  try {
    const response = await supabase.functions.invoke('skill-test-ai', {
      body: {
        action: 'tts',
        text: 'Bonjour, ceci est un test de synthèse vocale avec OpenAI.'
      }
    });
    
    console.log('Response:', response);
    console.log('Data:', response.data);
    console.log('Error:', response.error);
    
    if (response.data?.audio) {
      console.log('✅ Audio reçu! Taille base64:', response.data.audio.length);
      console.log('Format:', response.data.format);
      
      // Vérifier que c'est du base64 valide
      try {
        const decoded = atob(response.data.audio.substring(0, 100));
        console.log('✅ Base64 valide');
      } catch (e) {
        console.log('❌ Base64 invalide');
      }
    } else {
      console.log('❌ Pas d\'audio dans la réponse');
      console.log('Response data structure:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testTTS();