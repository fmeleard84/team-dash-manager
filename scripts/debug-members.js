// Script de debug pour comprendre pourquoi l'assistant ne remonte pas

console.log(`
=====================================
DEBUG: Pourquoi l'assistant n'apparaît pas ?
=====================================

PROBLÈME OBSERVÉ:
- Seul le client apparaît dans la liste
- L'assistant comptable n'est pas visible

CAUSES POSSIBLES:
1. L'assignation n'existe pas dans hr_resource_assignments
2. L'assignation existe mais n'a pas de candidate_id
3. Le candidate_profile n'existe pas
4. Une erreur empêche la récupération

SOLUTION IMMÉDIATE:
Le hook useProjectUsers utilise maintenant un fallback qui:
1. Récupère TOUTES les assignations (sans filtre)
2. Pour chaque assignation avec candidate_id:
   - Récupère le candidate_profile
   - L'ajoute à la liste
3. Pour chaque assignation avec profile_id (ancien système):
   - Récupère le hr_profile
   - L'ajoute à la liste

POUR DÉBOGUER:
1. Ouvrez la console du navigateur
2. Regardez les logs "📋 Fallback assignments"
3. Vérifiez:
   - Combien d'assignations sont trouvées ?
   - Y a-t-il des erreurs ?
   - Les candidate_id sont-ils présents ?

SI L'ASSISTANT N'APPARAÎT TOUJOURS PAS:
Il faut probablement:
1. Vérifier que l'assignation existe dans la DB
2. S'assurer qu'elle a un candidate_id ou profile_id
3. Vérifier que le statut n'est pas filtré

COMMANDE POUR CORRIGER:
Si l'assistant existe mais n'est pas "accepted":
- Utilisez la fonction fix-assignment-status
`);

console.log(`
📝 NOTES IMPORTANTES:
- La table project_members n'existe pas encore (normal)
- Le système utilise automatiquement le fallback
- Le fallback devrait récupérer TOUS les membres
`);