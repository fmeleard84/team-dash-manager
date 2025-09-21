#!/usr/bin/env node

// Script de diagnostic complet pour comprendre le problème IA côté candidat
// Ce script simule exactement ce que fait le hook useProjectMembersForMessaging

console.log('🔍 DIAGNOSTIC COMPLET - Visibilité IA côté candidat\n');
console.log('='.repeat(60));

// Simulons avoir un projet avec IA et candidats dans l'interface
console.log('\n📌 ANALYSE DU PROBLÈME:\n');

console.log('1. FAIT: Les IA apparaissent côté CLIENT ✅');
console.log('2. FAIT: Les IA n\'apparaissent PAS côté CANDIDAT ❌');
console.log('3. FAIT: Le hook useProjectMembersForMessaging est utilisé des deux côtés');

console.log('\n🔍 HYPOTHÈSES POSSIBLES:\n');

console.log('❓ Hypothèse 1: Les assignments IA n\'ont pas booking_status = "accepted"');
console.log('   → Le hook filtre avec: .in("booking_status", ["accepted", "completed"])');
console.log('   → Si l\'IA a un autre statut, elle ne sera pas récupérée');

console.log('\n❓ Hypothèse 2: La requête côté candidat utilise un filtre RLS différent');
console.log('   → Les politiques RLS pourraient filtrer différemment selon le rôle');

console.log('\n❓ Hypothèse 3: Le candidat n\'a pas accès aux hr_profiles avec is_ai');
console.log('   → La jointure hr_profiles pourrait échouer côté candidat');

console.log('\n❓ Hypothèse 4: Le problème est dans l\'affichage, pas dans les données');
console.log('   → Les membres sont récupérés mais pas affichés');

console.log('\n📋 PLAN DE DIAGNOSTIC:\n');

console.log('1. Vérifier dans la console du navigateur côté CANDIDAT:');
console.log('   → Chercher les logs "[MESSAGING]"');
console.log('   → Voir si "Added AI resource" apparaît');
console.log('   → Voir si "Keeping AI resource" apparaît lors du filtrage');

console.log('\n2. Vérifier la requête Supabase dans l\'onglet Network:');
console.log('   → Filtrer par "hr_resource_assignments"');
console.log('   → Voir si les IA sont dans la réponse JSON');

console.log('\n3. Points de vérification clés dans le code:');
console.log('   → Ligne 125: const isAI = assignment.hr_profiles?.is_ai || false');
console.log('   → Si hr_profiles est null/undefined, isAI sera false');
console.log('   → Ligne 102: .in("booking_status", ["accepted", "completed"])');
console.log('   → Si l\'IA n\'a pas ce statut, elle ne sera pas récupérée');

console.log('\n🎯 SOLUTION LA PLUS PROBABLE:\n');

console.log('Le problème est probablement que:');
console.log('1. Les IA ont booking_status = "accepted" côté CLIENT');
console.log('2. Mais côté CANDIDAT, la jointure hr_profiles échoue ou retourne null');
console.log('3. Donc isAI = false et l\'IA n\'est pas ajoutée comme IA');

console.log('\n💡 ACTION RECOMMANDÉE:\n');

console.log('Ajouter plus de logs de debug dans le hook pour voir exactement');
console.log('ce qui se passe avec les assignments et hr_profiles côté candidat.');
console.log('\nOu examiner les logs de la console du navigateur côté candidat');
console.log('pour voir les valeurs exactes retournées.');