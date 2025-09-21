# 🧪 Guide de Test - Intégration IA Complète

## ✅ Ce qui a été implémenté

### 1. **Détection d'Intentions**
L'IA analyse maintenant automatiquement les messages pour détecter :
- **Documents** : "Rédige un document", "Crée un rapport", "Génère un article"
- **Questions rapides** : "Explique", "Comment", "Qu'est-ce que"
- **Choix nécessaires** : Messages longs ou ambigus

### 2. **Système de Choix**
Pour les demandes ambiguës, l'IA propose 3 options :
1. 📄 Document Word dans le Drive
2. 💬 Réponse dans la messagerie
3. 📋 Les deux

### 3. **Sauvegarde Automatique**
- Les documents sont sauvegardés dans `/projects/{projectId}/IA/`
- Format : `YYYY-MM-DD_type_NomIA.docx`
- Notification de confirmation

## 📋 Tests à Effectuer

### Test 1 : Réponse Rapide
1. Envoyer à l'IA : "Explique ce qu'est React"
2. **Résultat attendu** : Réponse directe dans le chat, pas de menu

### Test 2 : Document Explicite
1. Envoyer à l'IA : "Rédige un article sur les bonnes pratiques React"
2. **Résultat attendu** :
   - Article généré
   - Sauvegarde automatique dans Drive
   - Message de confirmation avec nom du fichier

### Test 3 : Choix Proposé
1. Envoyer à l'IA : "J'aimerais une analyse complète du projet"
2. **Résultat attendu** :
   - Aperçu de la réponse (200 premiers caractères)
   - Menu avec 3 options
3. Répondre "1", "2" ou "3"
4. **Résultat attendu** : Action correspondante effectuée

### Test 4 : Visibilité IA
1. Créer un nouveau projet
2. Ajouter une ressource IA dans ReactFlow
3. Sauvegarder et booker l'équipe
4. **Vérifier** :
   - IA visible dans la messagerie côté client ✅
   - IA visible dans la messagerie côté candidat ✅
   - `booking_status = 'accepted'` automatiquement ✅

## 🐛 Points à Surveiller

1. **UUID Valides** : L'IA doit avoir `candidate_id = profile_id`
2. **Pas de préfixe 'ia_'** dans la base de données
3. **Messages filtrés correctement** dans les conversations privées
4. **Performance** : Pas de blocage de l'UI pendant génération IA

## 💡 Exemples de Messages

### Pour tester les documents
- "Rédige un document sur l'architecture de notre application"
- "Crée un rapport mensuel des activités"
- "Génère un article de blog sur les nouvelles fonctionnalités"

### Pour tester les réponses rapides
- "Comment utiliser le Drive ?"
- "Explique le système de booking"
- "Qu'est-ce que le statut 'play' ?"

### Pour tester les choix
- "Peux-tu analyser les performances du projet et proposer des améliorations ?"
- "J'aimerais un guide complet pour les nouveaux développeurs"
- "Aide-moi à comprendre l'architecture complète"

## 📊 Validation Finale

- [ ] L'IA répond aux messages
- [ ] Les documents sont créés dans le Drive
- [ ] Le menu de choix apparaît quand nécessaire
- [ ] Les choix 1, 2, 3 fonctionnent correctement
- [ ] Pas d'erreurs dans la console
- [ ] L'IA est visible pour tous les membres du projet
- [ ] Les notifications de sauvegarde s'affichent

## 🚀 Architecture Sans Code Spécifique

**Important** : Aucun code spécifique IA n'a été ajouté dans :
- `ProjectCard.tsx` ❌
- `ClientDashboard.tsx` ❌
- `CandidateDashboard.tsx` ❌

Tout passe par :
- `aiMessageHandler.ts` ✅ (logique centralisée)
- `EnhancedMessageSystemNeon.tsx` ✅ (gestion des choix)

L'IA reste une ressource standard qui suit les mêmes règles que les humains !