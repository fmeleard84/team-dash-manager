#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fichiers à migrer
const dialogFiles = [
  'src/components/kanban/dialogs/CardEditDialog.tsx',
  'src/components/kanban/dialogs/ColumnCreateDialog.tsx',
  'src/components/kanban/TaskRatingDialog.tsx',
  'src/components/candidate/EditExpertisesModal.tsx',
  'src/components/candidate/EditJobModal.tsx',
  'src/components/candidate/EditLanguagesModal.tsx',
  'src/components/candidate/EditRateModal.tsx',
  'src/components/candidate/EditSeniorityModal.tsx',
  'src/components/candidate/CandidateMissionCard.tsx',
  'src/components/candidate/CandidateMissionRequests.tsx',
  'src/components/client/FileShareModal.tsx',
  'src/components/messages/JitsiMeetIntegration.tsx',
  'src/components/hr/HRCategoriesPanel.tsx',
];

function migrateDialogToFullScreen(filePath) {
  console.log(`🔄 Migrating ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Remplacer les imports
  content = content.replace(
    /import\s*{\s*Dialog[^}]*}\s*from\s*["']@\/components\/ui\/dialog["'];?/g,
    'import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";'
  );
  
  content = content.replace(
    /import\s*{\s*AlertDialog[^}]*}\s*from\s*["']@\/components\/ui\/alert-dialog["'];?/g,
    'import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";'
  );
  
  // 2. Remplacer Dialog par FullScreenModal
  content = content.replace(
    /<Dialog\s+open={([^}]+)}\s+onOpenChange={([^}]+)}>/g,
    '<FullScreenModal isOpen={$1} onClose={() => $2(false)} title="" description="">'
  );
  
  // 3. Remplacer AlertDialog par FullScreenModal
  content = content.replace(
    /<AlertDialog\s+open={([^}]+)}\s+onOpenChange={([^}]+)}>/g,
    '<FullScreenModal isOpen={$1} onClose={() => $2(false)} title="" description="">'
  );
  
  // 4. Remplacer DialogContent/AlertDialogContent
  content = content.replace(
    /<DialogContent[^>]*>/g,
    '<div className="space-y-6">'
  );
  content = content.replace(
    /<\/DialogContent>/g,
    '</div>'
  );
  content = content.replace(
    /<AlertDialogContent[^>]*>/g,
    '<div className="space-y-6">'
  );
  content = content.replace(
    /<\/AlertDialogContent>/g,
    '</div>'
  );
  
  // 5. Remplacer DialogHeader/AlertDialogHeader
  content = content.replace(
    /<DialogHeader[^>]*>/g,
    '<div className="mb-6">'
  );
  content = content.replace(
    /<\/DialogHeader>/g,
    '</div>'
  );
  content = content.replace(
    /<AlertDialogHeader[^>]*>/g,
    '<div className="mb-6">'
  );
  content = content.replace(
    /<\/AlertDialogHeader>/g,
    '</div>'
  );
  
  // 6. Remplacer DialogTitle/AlertDialogTitle
  content = content.replace(
    /<DialogTitle[^>]*>([^<]*)<\/DialogTitle>/g,
    '<h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">$1</h2>'
  );
  content = content.replace(
    /<AlertDialogTitle[^>]*>([^<]*)<\/AlertDialogTitle>/g,
    '<h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">$1</h2>'
  );
  
  // 7. Remplacer DialogDescription/AlertDialogDescription
  content = content.replace(
    /<DialogDescription[^>]*>([^<]*)<\/DialogDescription>/g,
    '<p className="text-gray-300">$1</p>'
  );
  content = content.replace(
    /<AlertDialogDescription[^>]*>([^<]*)<\/AlertDialogDescription>/g,
    '<p className="text-gray-300">$1</p>'
  );
  
  // 8. Remplacer les fermetures
  content = content.replace(
    /<\/Dialog>/g,
    '</FullScreenModal>'
  );
  content = content.replace(
    /<\/AlertDialog>/g,
    '</FullScreenModal>'
  );
  
  // 9. Remplacer DialogFooter/AlertDialogFooter
  content = content.replace(
    /<DialogFooter[^>]*>/g,
    '<div className="flex justify-end gap-3 pt-6">'
  );
  content = content.replace(
    /<\/DialogFooter>/g,
    '</div>'
  );
  content = content.replace(
    /<AlertDialogFooter[^>]*>/g,
    '<div className="flex justify-end gap-3 pt-6">'
  );
  content = content.replace(
    /<\/AlertDialogFooter>/g,
    '</div>'
  );
  
  // 10. Appliquer le style néon aux boutons
  content = content.replace(
    /className="([^"]*)"(\s+onClick={[^}]+}\s+variant="outline")/g,
    'className="$1 bg-white/10 hover:bg-white/20 border-purple-500/30 text-white backdrop-blur-sm"$2'
  );
  
  // Sauvegarder le fichier migré
  fs.writeFileSync(filePath, content);
  console.log(`✅ Migrated ${filePath}`);
}

// Exécuter la migration
console.log('🚀 Starting Dialog to FullScreenModal migration...\n');

dialogFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    try {
      migrateDialogToFullScreen(fullPath);
    } catch (error) {
      console.error(`❌ Error migrating ${file}:`, error.message);
    }
  } else {
    console.warn(`⚠️ File not found: ${file}`);
  }
});

console.log('\n✨ Migration completed!');