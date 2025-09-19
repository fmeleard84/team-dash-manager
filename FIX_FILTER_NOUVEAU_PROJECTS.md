# 🔧 Correction du Filtre "Nouveau" pour les Projets Désarchivés

## Date : 19/09/2025

### 🐛 Problème Identifié

Les projets désarchivés :
- ✅ Étaient bien comptés dans le filtre "Nouveau" (compteur affichait 2)
- ❌ N'apparaissaient PAS quand on sélectionnait le filtre "Nouveau"

### 🔍 Cause du Problème

**Incohérence entre la logique de comptage et le mapping des catégories** :

#### Logique des Compteurs (CORRECTE)
- **"nouveau"** : projets avec `status='pause'` SANS ressources en recherche
- **"pause"** : projets avec `status='pause'` AVEC ressources en recherche

#### Mapping des Catégories (INCORRECT - AVANT)
```javascript
category: p.status === 'pause' ? 'pause' : 'nouveau'
```
➡️ TOUS les projets avec `status='pause'` étaient mis dans la catégorie "pause"

### ✅ Solution Appliquée

**Nouveau mapping des catégories** dans `src/components/client/ProjectsSection.tsx` :

```javascript
// Un projet en pause avec des ressources en recherche = "pause"
// Un projet en pause sans ressources = "nouveau"
category = hasResourcesInSearch ? 'pause' : 'nouveau';
```

### 📝 Logique Complète

Un projet avec `status='pause'` est maintenant catégorisé selon :
- **Sans ressources en recherche** → Catégorie "Nouveau" ✅
- **Avec ressources en recherche** → Catégorie "Pause" ⏸️

C'est logique car :
- Un projet désarchivé n'a pas d'équipe → "Nouveau"
- Un projet en attente d'équipe → "Pause"

### 🔄 Flux Après Désarchivage

1. Projet archivé avec `status='completed'`
2. Désarchivage → `status='pause'` + `archived_at=null`
3. Pas de ressources assignées
4. ➡️ Catégorie = "Nouveau"
5. ✅ Apparaît dans le filtre "Nouveau"

### 📊 Résultat

Les projets désarchivés :
- ✅ Sont comptés dans "Nouveau"
- ✅ Apparaissent quand on filtre par "Nouveau"
- ✅ Peuvent être distingués des projets en pause avec équipe

### 💡 Note Technique

Cette correction respecte la logique métier :
- **Nouveau** = Projet sans équipe (à configurer)
- **Pause** = Projet avec équipe en recherche
- **En cours** = Projet actif
- **Archivé** = Projet en lecture seule