#!/usr/bin/env node
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

async function testSaveAIContent() {
  console.log('🧪 Test de l\'Edge Function save-ai-content-to-drive...\n');

  const testData = {
    projectId: 'd2c755c5-8ef7-4bac-830f-1750a6cc6b9c',
    fileName: 'test_tweet_' + Date.now() + '.docx',
    content: `# Tweet de test

Voici un exemple de tweet pour tester la sauvegarde dans le Drive.

🍷 Le vin et le QR code : une alliance parfaite pour la traçabilité et l'authenticité.

#wine #technology #qrcode`,
    contentType: 'document',
    aiMemberName: 'Concepteur rédacteur IA',
    title: 'Tweet QRCode Wine Test',
    generateDocx: true,
    userId: '771a8efe-5a0d-4a7c-86a0-1881784f8850' // Francis
  };

  console.log('📝 Données envoyées:');
  console.log(JSON.stringify(testData, null, 2));

  try {
    console.log('\n🚀 Appel de l\'Edge Function...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/save-ai-content-to-drive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 Status HTTP:', response.status);
    console.log('📡 Status Text:', response.statusText);

    const responseText = await response.text();
    console.log('\n📄 Réponse brute:');
    console.log(responseText);

    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('\n✅ Succès! Résultat:');
        console.log(JSON.stringify(result, null, 2));
      } catch (e) {
        console.log('⚠️ Réponse non-JSON mais succès');
      }
    } else {
      console.log('\n❌ Erreur! Détails:');
      try {
        const error = JSON.parse(responseText);
        console.log(JSON.stringify(error, null, 2));
      } catch (e) {
        console.log('Réponse non-JSON:', responseText);
      }
    }
  } catch (error) {
    console.error('\n💥 Erreur réseau:', error);
  }
}

// Exécuter le test
testSaveAIContent().catch(console.error);