#!/usr/bin/env node

/**
 * Script pour vérifier l'utilisation des anciens Edge components
 * et faciliter leur migration vers UniversalEdge
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Liste des anciens Edge components à migrer
const OLD_EDGE_COMPONENTS = [
  'CleanEdge',
  'CustomBezierEdge',
  'CustomEdge',
  'DebugEdge',
  'FinalEdge',
  'FinalWorkingEdge',
  'FixedEdge',
  'IconOnlyEdge',
  'InteractiveEdge',
  'OfficialCustomEdge',
  'RobustIconEdge',
  'SimpleButtonEdge',
  'SimpleInteractiveEdge',
  'SimpleXyflowEdge',
  'StandardEdgeWithButton',
  'StatefulEdge',
  'TestEdge',
  'WorkingEdge'
];

// Fonction pour chercher les imports dans tous les fichiers
function findImports() {
  const pattern = path.join(__dirname, '../src/**/*.{tsx,ts,jsx,js}');
  const files = glob.sync(pattern);

  const results = {};

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    OLD_EDGE_COMPONENTS.forEach(component => {
      const importRegex = new RegExp(`import.*${component}.*from.*['"].*['"]`, 'g');
      const matches = content.match(importRegex);

      if (matches) {
        if (!results[component]) {
          results[component] = [];
        }
        results[component].push({
          file: file.replace(path.join(__dirname, '..'), ''),
          imports: matches
        });
      }
    });
  });

  return results;
}

// Fonction pour générer le rapport
function generateReport() {
  const imports = findImports();

  console.log('═══════════════════════════════════════════════════════');
  console.log('     RAPPORT DE MIGRATION DES EDGE COMPONENTS         ');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  const componentsInUse = Object.keys(imports);

  if (componentsInUse.length === 0) {
    console.log('✅ Aucun ancien Edge component trouvé !');
    console.log('   La migration est complète.');
  } else {
    console.log(`⚠️  ${componentsInUse.length} ancien(s) component(s) encore utilisé(s):`);
    console.log('');

    componentsInUse.forEach(component => {
      console.log(`📦 ${component}:`);
      imports[component].forEach(usage => {
        console.log(`   └─ ${usage.file}`);
      });
      console.log('');
    });

    console.log('─────────────────────────────────────────────────────');
    console.log('PROCHAINES ÉTAPES:');
    console.log('1. Remplacer les imports par: import UniversalEdge from "@/components/hr/UniversalEdge"');
    console.log('2. Adapter les props selon les besoins (voir edgePresets dans UniversalEdge)');
    console.log('3. Tester chaque modification');
    console.log('4. Supprimer les anciens fichiers une fois la migration terminée');
  }

  // Vérifier les fichiers Edge orphelins
  console.log('');
  console.log('─────────────────────────────────────────────────────');
  console.log('FICHIERS EDGE À SUPPRIMER:');

  const edgeDir = path.join(__dirname, '../src/components/hr');
  OLD_EDGE_COMPONENTS.forEach(component => {
    const filePath = path.join(edgeDir, `${component}.tsx`);
    if (fs.existsSync(filePath)) {
      const isUsed = componentsInUse.includes(component);
      const status = isUsed ? '⚠️  EN USAGE' : '✅ PEUT ÊTRE SUPPRIMÉ';
      console.log(`${status}: ${component}.tsx`);
    }
  });
}

// Exécution
generateReport();