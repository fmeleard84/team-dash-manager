# 📦 Legacy Code

Ce dossier contient l'ancien code pré-migration vers l'architecture modulaire.

## ⚠️ Important

- **NE PAS UTILISER** pour les évolutions futures
- **Code de référence uniquement** pour consultation
- **Sera supprimé** après validation complète des nouveaux modules
- **Aucun import actif** ne doit pointer vers ce dossier

## 📂 Structure du Legacy

```
legacy/
├── ai-assistant/      # Ancien assistant IA (remplacé par modules/ia-projects)
├── components/        # Anciens composants (remplacés par modules/*/components)
├── contexts/          # Anciens contexts (remplacé par modules/auth, etc.)
├── data/             # Données statiques anciennes
├── hooks/            # Anciens hooks (remplacés par modules/*/hooks)
├── ia-team/          # Ancien système IA team
├── pages/            # Anciennes pages (certaines conservées)
├── services/         # Anciens services (remplacés par modules/*/services)
└── types/            # Anciens types (remplacés par modules/*/types)
```

## 🔄 Migration Accomplie

✅ **ONBOARDING** → `/src/modules/onboarding/`
✅ **AUTH** → `/src/modules/auth/`
✅ **NOTIFICATIONS** → `/src/modules/notifications/`
✅ **PARAMÈTRES CANDIDAT** → `/src/modules/candidate-settings/`
✅ **PARAMÈTRES CLIENT** → `/src/modules/client-settings/`
✅ **IA PROJETS** → `/src/modules/ia-projects/`
✅ **IA QUALIFICATION** → `/src/modules/ia-qualification/`

## 📋 Prochaines Étapes

1. ✅ Migration complète vers architecture modulaire
2. 🔄 **En cours** : Correction des imports vers `/src/modules/`
3. ⏳ Tests module par module
4. ⏳ Suppression définitive du legacy après validation

---

**Date de migration** : 27 septembre 2025
**Status** : Code legacy inactif - Consultation seule