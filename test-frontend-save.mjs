import fetch from 'node-fetch';

// Configuration
const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

// ID du projet à utiliser
const PROJECT_ID = '1ddbce2b-93fa-42db-8e24-08c0d38e37f7';

// Contenu de test
const testContent = `# Guide de l'Intelligence Artificielle

## Introduction
Voici un document de test généré par l'IA pour vérifier le système de sauvegarde.

## Sections principales
- Section 1 : Concepts de base
- Section 2 : Applications pratiques
- Section 3 : Perspectives futures

## Conclusion
Document test complété avec succès.
`;

async function testFrontendSave() {
  console.log('🧪 Test de l\'appel frontend simulé...\n');

  const functionUrl = `${SUPABASE_URL}/functions/v1/save-ai-content-to-drive`;

  const requestBody = {
    projectId: PROJECT_ID,
    fileName: 'test_frontend_' + new Date().getTime() + '.docx',
    content: testContent,
    contentType: 'document',
    aiMemberName: 'IA Rédacteur',
    title: 'Test Frontend Save',
    generateDocx: true,
    userId: '771a8efe-5a0d-4a7c-86a0-1881784f8850' // ID utilisateur test
  };

  console.log('📦 Body envoyé:', JSON.stringify(requestBody, null, 2));
  console.log('\n🔗 URL:', functionUrl);
  console.log('\n📨 Envoi de la requête...');

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}` // Utiliser la clé anon comme token
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();

    console.log('\n📊 Status:', response.status, response.statusText);
    console.log('\n📦 Réponse brute:', responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ Succès! Données:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('\n⚠️ Réponse non-JSON mais succès HTTP');
      }
    } else {
      console.log('\n❌ Erreur HTTP:', response.status);
    }

  } catch (error) {
    console.error('\n❌ Erreur complète:', error);
  }
}

// Exécuter le test
testFrontendSave();