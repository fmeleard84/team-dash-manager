import { createClient } from '@supabase/supabase-js';
import * as docx from 'docx';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour générer un document DOCX
async function generateDocxBuffer(data) {
  const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // En-tête
        new Paragraph({
          text: data.title || 'Document généré par IA',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),

        // Métadonnées
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'Auteur: ', bold: true }),
            new TextRun({ text: data.author || 'IA' })
          ]
        }),

        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'Date: ', bold: true }),
            new TextRun({ text: new Date().toLocaleDateString('fr-FR') })
          ]
        }),

        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'Type de contenu: ', bold: true }),
            new TextRun({ text: data.contentType || 'Document' })
          ]
        }),

        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: 'Projet ID: ', bold: true }),
            new TextRun({ text: data.projectId })
          ]
        }),

        // Ligne de séparation
        new Paragraph({
          text: '─'.repeat(50),
          spacing: { after: 400 }
        }),

        // Contenu principal
        new Paragraph({
          text: 'Contenu',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 300 }
        }),

        ...data.content.split('\n').map(line =>
          new Paragraph({
            text: line,
            spacing: { after: 200 }
          })
        ),

        // Pied de page
        new Paragraph({
          text: '─'.repeat(50),
          spacing: { before: 400, after: 200 }
        }),

        new Paragraph({
          text: 'Document généré automatiquement par l\'IA de l\'équipe',
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: 'Document généré automatiquement par l\'IA de l\'équipe',
              italics: true,
              size: 20
            })
          ]
        })
      ]
    }]
  });

  // Générer le buffer
  const buffer = await docx.Packer.toBuffer(doc);
  return buffer;
}

async function testDocxGeneration() {
  console.log('🧪 Test de génération DOCX pour contenu IA...\n');

  try {
    // 1. Trouver un projet avec une IA
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        hr_resource_assignments!inner(
          profile_id,
          candidate_id,
          booking_status,
          hr_profiles!inner(
            id,
            name,
            is_ai
          )
        )
      `)
      .eq('hr_resource_assignments.hr_profiles.is_ai', true)
      .eq('hr_resource_assignments.booking_status', 'accepted')
      .limit(1)
      .single();

    if (projectError || !projects) {
      console.error('❌ Pas de projet avec IA trouvé:', projectError);
      return;
    }

    const project = projects;
    const iaResource = project.hr_resource_assignments.find(r => r.hr_profiles.is_ai);

    console.log('📋 Projet trouvé:', project.title);
    console.log('🤖 IA trouvée:', iaResource.hr_profiles.name);

    // 2. Générer un contenu exemple
    const testContent = `# Plan de test application

## Objectif
Valider le bon fonctionnement de l'application après les dernières modifications.

## Stratégie de test

### 1. Tests unitaires
- Vérifier chaque composant individuellement
- Couverture minimale de 80%
- Focus sur les fonctions critiques

### 2. Tests d'intégration
- Tester les interactions entre modules
- Validation des flux de données
- Vérification des APIs

### 3. Tests de performance
- Temps de réponse < 200ms
- Support de 100 utilisateurs simultanés
- Optimisation des requêtes base de données

## Planning
- Semaine 1: Mise en place environnement
- Semaine 2: Développement tests unitaires
- Semaine 3: Tests d'intégration
- Semaine 4: Tests de performance et rapport

## Risques identifiés
- Manque de données de test réalistes
- Environnement de test instable
- Délais serrés

## Conclusion
Ce plan couvre l'ensemble des aspects critiques pour garantir la qualité.`;

    // 3. Générer le document DOCX
    console.log('\n📄 Génération du document DOCX...');

    const docxBuffer = await generateDocxBuffer({
      title: 'Plan de Test Application',
      author: iaResource.hr_profiles.name,
      projectId: project.id,
      contentType: 'plan',
      content: testContent
    });

    console.log('✅ Document DOCX généré, taille:', docxBuffer.length, 'octets');

    // 4. Convertir en base64 pour l'Edge Function
    const base64Buffer = Buffer.from(docxBuffer).toString('base64');

    // 5. Appeler l'Edge Function
    console.log('\n📤 Envoi vers Edge Function save-ai-content-to-drive...');

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `${timestamp}_test_plan_${iaResource.hr_profiles.name.replace(/\s+/g, '_')}.docx`;

    const response = await fetch(`${supabaseUrl}/functions/v1/save-ai-content-to-drive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        projectId: project.id,
        fileName: fileName,
        content: testContent,
        contentType: 'plan',
        aiMemberName: iaResource.hr_profiles.name,
        isDocx: true,
        docxBuffer: base64Buffer
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Document sauvegardé avec succès !');
      console.log('📁 Chemin:', result.data.filePath);
      console.log('🔗 URL:', result.data.fileUrl);
      console.log('📊 Taille:', result.data.fileSize, 'octets');
      console.log('🤖 IA:', result.data.aiMemberName);
      console.log('📝 Type:', result.data.contentType);
    } else {
      console.error('❌ Erreur:', result.error);
    }

  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
}

// Lancer le test
testDocxGeneration();