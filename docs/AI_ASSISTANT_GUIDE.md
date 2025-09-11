# Guide de l'Assistant Vocal IA

## 🎯 Vue d'ensemble

L'assistant vocal IA de Team Dash Manager est un assistant intelligent capable de :
- **Répondre aux questions** sur la plateforme
- **Créer des réunions** dans vos projets
- **Composer des équipes** avec les bons profils
- **Créer des projets** complets
- **Rechercher des informations** dans vos projets

## 🚀 Accès à l'assistant

### Pour les utilisateurs
1. Cliquez sur l'**icône microphone** 🎙️ dans le header (coin supérieur droit)
2. Cliquez sur **"Démarrer la conversation"**
3. Autorisez l'accès au microphone si demandé
4. Parlez naturellement ou tapez votre message

### Pour les administrateurs
1. Accédez à `/admin/assistant` pour gérer :
   - **FAQ** : Questions fréquentes et réponses
   - **Prompts** : Comportement de l'assistant
   - **Historique** : Suivi des actions effectuées

## 💬 Exemples de commandes vocales

### Créer une réunion
```
"Crée une réunion demain à 14h pour le projet Alpha"
"Programme un meeting le 15 janvier à 10h30 pour discuter du budget"
"Ajoute une réunion d'équipe vendredi prochain à 9h"
```

### Créer une équipe
```
"Crée une équipe avec 2 développeurs senior et 1 designer junior pour le projet Beta"
"J'ai besoin d'une équipe de 3 développeurs et 1 chef de projet pour mon nouveau projet"
"Compose une équipe avec un développeur expert en React et un designer UI/UX"
```

### Créer un projet
```
"Crée un nouveau projet appelé Site E-commerce qui commence le 1er février et finit le 30 avril"
"J'aimerais créer un projet Application Mobile avec un budget de 50000€"
"Nouveau projet: Refonte Site Web, durée 3 mois, équipe de 4 personnes"
```

### Rechercher des informations
```
"Montre-moi mes projets en cours"
"Quel est le statut du projet Alpha ?"
"Recherche les projets qui commencent ce mois"
```

### Questions sur la plateforme
```
"Comment utiliser le Kanban ?"
"Comment inviter des membres dans mon équipe ?"
"Qu'est-ce que ReactFlow ?"
"Comment partager des fichiers ?"
```

## 🛠️ Actions disponibles

### 1. create_meeting
Crée une réunion dans le planning d'un projet.

**Paramètres** :
- `project_name` : Nom du projet
- `title` : Titre de la réunion
- `date` : Date (format YYYY-MM-DD)
- `time` : Heure (format HH:MM)
- `duration` : Durée en minutes (optionnel, défaut: 60)
- `description` : Description (optionnel)
- `participants` : Liste des participants (optionnel)

### 2. create_team
Compose une équipe pour un projet.

**Paramètres** :
- `project_name` : Nom du projet
- `profiles` : Liste des profils avec :
  - `profession` : Métier (Développeur, Designer, etc.)
  - `seniority` : Niveau (junior, medior, senior, expert)
  - `skills` : Compétences requises (optionnel)
  - `languages` : Langues parlées (optionnel)

### 3. create_project
Crée un nouveau projet complet.

**Paramètres** :
- `name` : Nom du projet
- `description` : Description
- `start_date` : Date de début
- `end_date` : Date de fin
- `budget` : Budget (optionnel)
- `team` : Équipe initiale (optionnel)

### 4. search_project
Recherche des projets par nom.

**Paramètres** :
- `query` : Terme de recherche

### 5. get_faq
Obtient des réponses aux questions fréquentes.

**Paramètres** :
- `query` : Question ou sujet (optionnel)

## 🎨 Personnalisation (Admin)

### Gestion des FAQ
1. Allez dans `/admin/assistant`
2. Onglet **FAQ**
3. Actions possibles :
   - **Ajouter** : Créer une nouvelle FAQ
   - **Modifier** : Éditer question/réponse
   - **Réorganiser** : Changer l'ordre avec les flèches
   - **Activer/Désactiver** : Contrôler la visibilité
   - **Tags** : Ajouter des mots-clés pour améliorer la recherche

### Gestion des Prompts
1. Allez dans `/admin/assistant`
2. Onglet **Prompts**
3. Types de prompts :
   - **System** : Instructions de base de l'assistant
   - **Context** : Informations sur la plateforme
   - **Behavior** : Comportement et ton de l'assistant
4. Actions :
   - **Priorité** : Ordre d'application des prompts
   - **Actif/Inactif** : Contrôler l'utilisation

### Suivi des actions
1. Allez dans `/admin/assistant`
2. Onglet **Historique**
3. Visualisez :
   - Actions effectuées
   - Statut (succès/échec)
   - Détails des paramètres
   - Messages d'erreur éventuels

## 🔧 Configuration technique

### Prérequis
- Clé API OpenAI configurée dans Supabase
- Accès à l'API Realtime d'OpenAI
- Microphone fonctionnel (pour la voix)

### Architecture
```
Utilisateur → Microphone/Texte
     ↓
Assistant Vocal (WebRTC)
     ↓
OpenAI Realtime API
     ↓
Outils/Functions
     ↓
Base de données Supabase
     ↓
Actions dans l'application
```

## 📊 Bonnes pratiques

### Pour les utilisateurs
1. **Soyez précis** dans vos demandes
2. **Mentionnez le nom du projet** pour les actions spécifiques
3. **Utilisez des dates claires** (demain, 15 janvier, etc.)
4. **Vérifiez les confirmations** avant validation

### Pour les administrateurs
1. **Maintenez les FAQ à jour** avec les questions récurrentes
2. **Testez les prompts** avant activation
3. **Surveillez l'historique** pour identifier les erreurs
4. **Documentez les cas d'usage** courants

## 🆘 Dépannage

### L'assistant ne répond pas
- Vérifiez votre connexion internet
- Vérifiez que le microphone est autorisé
- Rafraîchissez la page et réessayez

### Erreur lors d'une action
- Vérifiez que le projet existe
- Vérifiez les permissions sur le projet
- Consultez l'historique dans l'admin

### Mauvaise compréhension
- Reformulez votre demande
- Soyez plus spécifique
- Utilisez le mode texte si nécessaire

## 📚 Ressources

- [Documentation OpenAI Realtime](https://platform.openai.com/docs/guides/realtime)
- [Guide Team Dash Manager](/llm)
- [Support technique](mailto:support@teamdash.com)