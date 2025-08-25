#!/usr/bin/env node

// Créons une fonction Edge pour vérifier quelle clé est vraiment utilisée
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOpenAIKey() {
  console.log('🔍 Vérification de la configuration OpenAI...\n');
  
  // Appeler la fonction avec une action de test
  try {
    const response = await supabase.functions.invoke('skill-test-ai', {
      body: {
        action: 'start',
        candidateInfo: {
          firstName: 'Test',
          lastName: 'User',
          jobTitle: 'Developer',
          seniority: 'senior',
          expertises: ['JavaScript'],
          languages: ['Français'],
          category: 'Tech'
        }
      }
    });

    if (response.data) {
      console.log('✅ La fonction répond correctement');
      console.log('Réponse:', response.data.message?.substring(0, 100) + '...');
      
      // Si la fonction fonctionne, c'est que OpenAI est configuré OU qu'il y a un fallback
      if (response.data.isSimulated) {
        console.log('\n⚠️ Mode simulation activé - OpenAI n\'est pas configuré correctement');
      } else {
        console.log('\n✅ OpenAI est configuré et fonctionne');
      }
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkOpenAIKey();