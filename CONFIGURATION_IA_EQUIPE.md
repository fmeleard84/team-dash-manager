# Configuration pour l'Assistant IA - Création d'équipe

## 📋 Prérequis IMPORTANT

Pour que l'assistant IA puisse créer des équipes via la voix, vous devez d'abord configurer les données de base dans l'interface Admin.

## 🔧 Configuration étape par étape

### 1. Créer les Catégories de métiers
1. Allez dans **Admin > Ressources > Catégories**
2. Créez des catégories comme :
   - Développement
   - Design
   - Marketing
   - Gestion de projet
   - etc.

### 2. Créer les Métiers/Profils
1. Allez dans **Admin > Ressources > Métiers**
2. Pour chaque métier, définissez :
   - **Nom** : ex: "developer_fullstack" (utilisé en interne)
   - **Catégorie** : sélectionnez parmi celles créées
   - **Prix de base** : tarif journalier de base
   - **IA** : cochez si c'est un profil IA

### 3. Créer les Langues
1. Allez dans **Admin > Ressources > Langues**
2. Ajoutez les langues :
   - Français (FR, +0%)
   - Anglais (EN, +5%)
   - Espagnol (ES, +5%)
   - etc.

### 4. Créer les Expertises
1. Allez dans **Admin > Ressources > Expertises**
2. Pour chaque expertise :
   - **Nom** : ex: "React", "Node.js", "Figma"
   - **Catégorie** : liez à une catégorie
   - **Coût** : pourcentage supplémentaire

### 5. Associer les Expertises aux Métiers
1. Après avoir créé métiers et expertises
2. Dans la gestion des métiers, associez les expertises pertinentes
3. Exemple : au métier "Développeur Full-Stack", associez "React", "Node.js", etc.

## 🤖 Utilisation avec l'IA

### Exemples de commandes vocales qui fonctionneront :

```
"Crée une équipe avec un développeur full-stack senior, 
un designer UI/UX medior et un chef de projet expert"
```

```
"J'ai besoin d'une équipe pour un projet web avec 
un développeur WordPress junior parlant français et anglais"
```

### Ce que l'IA recherche :

1. **Métier** : recherche dans `hr_profiles.name`
   - Ex: "développeur" → trouve "developer_fullstack"
   
2. **Séniorité** : junior, medior, senior, expert
   
3. **Langues** : recherche dans `hr_languages.name`
   - Ex: "français" → trouve "Français"
   
4. **Compétences** : recherche dans les expertises associées au métier

## ⚠️ Résolution des problèmes

### L'IA ne trouve pas le métier
- Vérifiez que le métier existe dans **Admin > Ressources > Métiers**
- Le nom doit contenir le mot clé (ex: "developer" pour "développeur")

### L'IA ne trouve pas les langues
- Vérifiez dans **Admin > Ressources > Langues**
- Les noms doivent correspondre exactement

### L'IA ne trouve pas les compétences
- Vérifiez que les expertises sont créées
- Vérifiez qu'elles sont associées au métier concerné

## 📊 Structure de la base de données

```
hr_categories (Catégories de métiers)
├── hr_profiles (Métiers/Profils)
│   ├── name: string (ex: "developer_fullstack")
│   ├── category_id: uuid
│   └── base_price: number
│
├── hr_languages (Langues disponibles)
│   ├── name: string (ex: "Français")
│   └── cost_percentage: number
│
├── hr_expertises (Compétences/Expertises)
│   ├── name: string (ex: "React")
│   └── category_id: uuid
│
└── hr_profile_expertises (Association métier-expertise)
    ├── profile_id: uuid
    └── expertise_id: uuid
```

## 🚀 Démarrage rapide

1. Créez au moins une catégorie
2. Créez au moins un métier dans cette catégorie
3. Créez quelques langues (Français, Anglais minimum)
4. Créez quelques expertises
5. Associez les expertises au métier
6. Testez avec l'assistant vocal !

## 💡 Conseils

- Utilisez des noms de métiers courants (développeur, designer, chef de projet)
- Les expertises doivent être précises (React, Vue.js, Figma, Adobe XD)
- Les langues doivent être écrites en toutes lettres (Français, pas FR)
- Associez plusieurs expertises à chaque métier pour plus de flexibilité

## 📝 Exemple de configuration minimale

1. **Catégorie** : "Développement"
2. **Métier** : "developer_fullstack" (Catégorie: Développement, Prix: 500€)
3. **Langues** : "Français", "Anglais"
4. **Expertises** : "JavaScript", "React", "Node.js"
5. **Association** : Liez les 3 expertises au métier "developer_fullstack"

Avec cette configuration, l'IA pourra créer une équipe avec un développeur full-stack !