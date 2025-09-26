const fs = require('fs');

const contentData = fs.readFileSync('content-data.js', 'utf-8');

// Remove the useState wrapper to get just the object
let objectStart = contentData.indexOf('{');
let objectEnd = contentData.lastIndexOf('});');

const objectContent = contentData.slice(objectStart, objectEnd + 1);

// Parse the object content to extract individual sections
const sections = {};
const sectionNames = [];

// Use regex to find section boundaries
const sectionRegex = /['"]([^'"]+)['"]\s*:\s*`([^`]*(?:`[^`]*)*)`/gs;

let match;
while ((match = sectionRegex.exec(objectContent)) !== null) {
  const sectionName = match[1];
  const sectionContent = match[2];
  sections[sectionName] = sectionContent;
  sectionNames.push(sectionName);
}

console.log(`Found ${sectionNames.length} sections:`, sectionNames);

// Generate the TypeScript export
let tsContent = `// LLM Documentation Content Data
// This file contains all the documentation sections for the LLM Dashboard

export interface DocumentationSection {
  [key: string]: string;
}

export const documentationSections: DocumentationSection = {
`;

// Add each section
for (const [sectionName, sectionContent] of Object.entries(sections)) {
  tsContent += `  '${sectionName}': \`${sectionContent}\`,\n\n`;
}

tsContent += `};

// Section titles mapping
export const sectionTitles: Record<string, string> = {
  'general': '📚 Documentation Générale',
  'design-system': '🎨 Design System',
  'candidat-flow': 'Flux candidat',
  'candidat-onboarding': 'Onboarding candidat',
  'candidat-qualification': 'Qualification candidat',
  'candidat-missions': 'Gestion des missions',
  'candidat-activities': '⏱️ Activités & Time Tracking',
  'candidat-realtime': 'Candidat temps réel',
  'projet-workflow': 'Workflow projet',
  'projet-pause-reprise': '⏸️ Pause/Reprise projet',
  'projet-edition-candidat': '🔄 Édition & Changement candidat',
  'projet-demarrage': '🔥 Démarrage projet',
  'projet-orchestration': 'Orchestration projet',
  'projet-collaboration': 'Outils collaboratifs',
  'projet-planning': 'Planning & Événements',
  'projet-messagerie': '💬 Messagerie',
  'projet-drive': '📁 Drive',
  'db-schema': 'Schéma base de données',
  'db-rls': 'RLS & Sécurité',
  'db-realtime': 'Tables temps réel',
  'db-functions': 'Edge Functions',
  'corrections-unified-ids': '🔄 Unification IDs',
  'corrections-session5': '🔧 Session 5',
  'corrections-session4': '🔧 Session 4',
  'corrections-session3': '🔧 Session 3',
  'corrections-session2': '🔧 Session 2',
  'corrections-session1': '🔧 Session 1',
  'wiki-overview': '🎯 Wiki Vue d\\'ensemble',
  'wiki-architecture': '🏗️ Architecture Wiki',
  'wiki-permissions': '🔐 Permissions Wiki',
  'wiki-realtime': '⚡ Synchronisation Wiki',
  'wiki-comments': '💬 Commentaires Wiki',
  'wiki-navigation': '🧭 Navigation Wiki',
  'wiki-editor': '✏️ Éditeur Wiki'
};

export const getSectionTitle = (sectionId: string): string => {
  return sectionTitles[sectionId] || sectionId;
};

export const getSectionContent = (sectionId: string): string => {
  return documentationSections[sectionId] || \`# Section \${sectionId}

Contenu non trouvé pour cette section.\`;
};
`;

fs.writeFileSync('src/components/llm/LLMDocumentationSections.tsx', tsContent, 'utf-8');
console.log('Generated LLMDocumentationSections.tsx with', Object.keys(sections).length, 'sections');