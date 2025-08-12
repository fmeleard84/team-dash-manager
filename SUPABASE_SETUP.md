# Configuration Supabase pour le Tableau Kanban

## 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com) et créez un compte
2. Créez un nouveau projet
3. Notez l'URL du projet et la clé anonyme (anon key)

## 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet avec le contenu suivant :

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Remplacez les valeurs par celles de votre projet Supabase.

## 3. Exécuter le schéma de base de données

1. Dans votre dashboard Supabase, allez dans l'onglet "SQL Editor"
2. Copiez le contenu du fichier `supabase-schema.sql`
3. Collez-le dans l'éditeur SQL et exécutez-le

Cela créera les tables suivantes :
- `kanban_boards` : Les tableaux Kanban
- `kanban_columns` : Les colonnes de chaque tableau  
- `kanban_cards` : Les cartes de chaque colonne

## 4. Modifier le code pour utiliser Supabase

Pour utiliser Supabase au lieu du localStorage, modifiez le fichier `src/pages/KanbanPage.tsx` :

```typescript
// Remplacez cette ligne :
import { useKanban } from '@/hooks/useKanban';

// Par cette ligne :
import { useKanbanSupabase as useKanban } from '@/hooks/useKanbanSupabase';
```

## 5. Fonctionnalités disponibles

Avec Supabase, vous bénéficiez de :

✅ **Persistence en base de données** - Vos données sont sauvegardées de façon permanente
✅ **Synchronisation temps réel** - Les modifications sont visibles instantanément
✅ **Collaboration multi-utilisateur** - Plusieurs personnes peuvent travailler simultanément
✅ **Sauvegardes automatiques** - Vos données sont sauvegardées automatiquement
✅ **Authentification** - Possibilité d'ajouter la gestion des utilisateurs
✅ **API REST automatique** - Accès aux données via une API REST
✅ **Sécurité RLS** - Contrôle d'accès au niveau des lignes

## 6. Migration des données localStorage vers Supabase

Si vous avez déjà des données dans localStorage, vous pouvez les migrer :

1. Exportez vos tableaux actuels en JSON depuis l'interface
2. Importez-les après avoir configuré Supabase
3. Les données seront automatiquement sauvegardées en base

## 7. Avantages par rapport au localStorage

| Feature | localStorage | Supabase |
|---------|-------------|----------|
| Persistence | ❌ Locale uniquement | ✅ Permanente |
| Multi-device | ❌ Non | ✅ Oui |
| Collaboration | ❌ Non | ✅ Oui |
| Temps réel | ❌ Non | ✅ Oui |
| Sauvegarde | ❌ Risque de perte | ✅ Automatique |
| Authentification | ❌ Non | ✅ Intégrée |

## Configuration avancée (optionnel)

### Authentification
Pour ajouter l'authentification utilisateur, configurez les providers dans Supabase :
- Email/Password
- Google OAuth  
- GitHub OAuth
- etc.

### Temps réel
Pour activer les mises à jour temps réel, activez les Realtime subscriptions sur vos tables dans le dashboard Supabase.

### Permissions
Modifiez les politiques RLS dans le fichier SQL pour restreindre l'accès selon vos besoins.