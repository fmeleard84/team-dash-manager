# 📚 Documentation LLM - Team Dash Manager

> Cette section contient toute la documentation technique pour les LLM (Language Learning Models) qui travaillent sur ce projet.

## 🗂️ Structure de la documentation

### 🤖 [Système IA](./ia-system-documentation.md)
Documentation complète du système d'intelligence artificielle intégré :
- Architecture des deux IA (texte et audio)
- Base vectorielle et pgvector
- Système de prompts
- Fonctions et outils disponibles
- Guide de maintenance et évolution

### 🏗️ [Architecture Technique](./CLAUDE.md)
Documentation Claude originale :
- Structure de la base de données
- Flux métiers
- Statuts système
- Points d'attention

### 📋 [Configuration IA Équipe](./CONFIGURATION_IA_EQUIPE.md)
Guide de configuration pour l'assistant IA :
- Métiers disponibles
- Expertises par métier
- Règles de composition d'équipe

### 💼 [Métiers Disponibles](./METIERS_DISPONIBLES_IA.md)
Liste complète des métiers utilisables par l'IA :
- Catégories de métiers
- Compétences associées
- Tarifs indicatifs

---

## 🚀 Quick Start pour un nouveau LLM

### 1. Comprendre le projet
1. Lire [CLAUDE.md](./CLAUDE.md) pour comprendre l'architecture
2. Parcourir [ia-system-documentation.md](./ia-system-documentation.md) pour le système IA
3. Consulter les métiers disponibles dans [METIERS_DISPONIBLES_IA.md](./METIERS_DISPONIBLES_IA.md)

### 2. Points d'entrée principaux

#### Frontend
- `/src/pages/ClientDashboard.tsx` - Dashboard client
- `/src/pages/CandidateDashboard.tsx` - Dashboard candidat
- `/src/components/client/TextChatInterface.tsx` - IA texte
- `/src/components/client/EnhancedVoiceAssistant.tsx` - IA vocale

#### Backend (Edge Functions)
- `/supabase/functions/chat-completion` - API chat IA
- `/supabase/functions/project-orchestrator` - Création de projets
- `/supabase/functions/resource-booking` - Gestion des ressources

#### Hooks IA
- `/src/ai-assistant/hooks/useTextChat.ts` - Hook IA texte
- `/src/ai-assistant/hooks/useRealtimeAssistant.ts` - Hook IA vocale

### 3. Base de données

Tables principales :
- `projects` - Projets
- `hr_profiles` - Métiers disponibles
- `hr_expertises` - Compétences
- `hr_resource_assignments` - Affectations
- `prompts_ia` - Prompts système
- `faq_items` - FAQ

### 4. Commandes utiles

```bash
# Développement local
npm run dev

# Vérifier le système IA
node check-ia-system.mjs

# Déployer une Edge Function
SUPABASE_ACCESS_TOKEN="..." \
SUPABASE_DB_PASSWORD="..." \
npx supabase functions deploy [nom-fonction] \
  --project-ref egdelmcijszuapcpglsy
```

---

## 📝 Conventions de développement

### Git
- Messages de commit en français
- Préfixes : ✨ feat, 🐛 fix, 📝 docs, ♻️ refactor
- Branches : feature/*, fix/*, docs/*

### Code
- TypeScript strict
- Composants React fonctionnels
- Hooks personnalisés pour la logique
- Tailwind CSS pour les styles

### Documentation
- Mettre à jour cette section après chaque changement majeur
- Documenter les Edge Functions
- Commenter le code complexe

---

## 🔐 Sécurité

⚠️ **IMPORTANT** : 
- Ne jamais exposer les clés API dans le code
- Utiliser les variables d'environnement Supabase
- Activer RLS sur toutes les tables
- Valider toutes les entrées utilisateur

---

## 📞 Support

Pour toute question sur cette documentation :
1. Vérifier d'abord les logs dans `/admin/assistant`
2. Consulter les Edge Functions logs dans Supabase Dashboard
3. Créer une issue sur GitHub si nécessaire

---

*Dernière mise à jour : 13/09/2025*