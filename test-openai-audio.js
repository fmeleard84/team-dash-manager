#!/usr/bin/env node

import fetch from 'node-fetch';

// Configuration - Utilise la vraie clé OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_API_KEY_HERE';

async function testOpenAIConnection() {
  console.log('🔍 Test de connexion OpenAI...\n');
  
  // Test 1: Vérifier que la clé fonctionne avec un appel simple
  console.log('1️⃣ Test basique GPT-4...');
  try {
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: 'Dis simplement "OK"' }],
        max_tokens: 10
      }),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      console.log('❌ Erreur GPT-4:', chatResponse.status, error);
    } else {
      const data = await chatResponse.json();
      console.log('✅ GPT-4 fonctionne:', data.choices[0].message.content);
    }
  } catch (error) {
    console.log('❌ Erreur réseau GPT-4:', error.message);
  }

  console.log('\n2️⃣ Test TTS (Text-to-Speech)...');
  try {
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: 'Bonjour, ceci est un test audio.',
        voice: 'nova',
        response_format: 'mp3'
      }),
    });

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.log('❌ Erreur TTS:', ttsResponse.status, error);
    } else {
      const buffer = await ttsResponse.arrayBuffer();
      console.log('✅ TTS fonctionne! Audio reçu:', buffer.byteLength, 'bytes');
    }
  } catch (error) {
    console.log('❌ Erreur réseau TTS:', error.message);
  }

  console.log('\n3️⃣ Test Whisper (Speech-to-Text)...');
  try {
    // Créer un petit fichier audio de test (silence)
    const silentWebM = Buffer.from([
      0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81,
      0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x02
    ]);

    const formData = new FormData();
    const blob = new Blob([silentWebM], { type: 'audio/webm' });
    formData.append('file', blob, 'test.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      console.log('❌ Erreur Whisper:', whisperResponse.status, error);
    } else {
      const data = await whisperResponse.json();
      console.log('✅ Whisper fonctionne! Transcription:', data.text || '(silence détecté)');
    }
  } catch (error) {
    console.log('❌ Erreur réseau Whisper:', error.message);
  }

  console.log('\n📊 Résumé du diagnostic:');
  console.log('================================');
  console.log('Clé API utilisée:', OPENAI_API_KEY.substring(0, 10) + '...');
  console.log('Si tous les tests échouent avec 401: La clé API est invalide');
  console.log('Si certains tests passent: Problème spécifique à certaines APIs');
  console.log('Si erreur réseau: Problème de connexion');
}

testOpenAIConnection();