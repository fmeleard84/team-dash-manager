# Configuration du Webhook pour la création automatique des profils

## Solution permanente et propre pour créer automatiquement les profils candidats/clients

### Pourquoi un webhook ?
- **Impossible de créer un trigger sur `auth.users`** : Cette table appartient à Supabase et nécessite des privilèges spéciaux
- **Les webhooks sont la solution officielle recommandée** par Supabase pour réagir aux changements dans `auth.users`
- **Solution propre et maintenable** : Pas de hacks ou de solutions temporaires

### Étapes de configuration (3 minutes)

#### 1. Accéder aux Database Webhooks
Allez sur : https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/database/hooks

#### 2. Créer un nouveau webhook
Cliquez sur **"Create a new hook"** et configurez :

- **Name**: `handle_new_user`
- **Table**: `auth.users`
- **Events**: ✅ INSERT (cochez uniquement INSERT)
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://egdelmcijszuapcpglsy.supabase.co/functions/v1/handle-new-user`
- **Headers**: 
  ```
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0
  ```

#### 3. Sauvegarder
Cliquez sur **"Create webhook"**

### ✅ C'est fait !

Une fois le webhook configuré :
- Tous les nouveaux utilisateurs auront automatiquement leur profil créé
- Les candidats auront leur `candidate_profiles` créé avec le statut `disponible`
- Les clients auront leur `client_profiles` créé
- L'onboarding fonctionnera parfaitement

### Test
Pour tester :
1. Créez un nouveau compte candidat
2. Vérifiez dans la table `candidate_profiles` que le profil a été créé automatiquement
3. L'utilisateur pourra se connecter sans erreur 406

### Avantages de cette solution
- ✅ **Permanente** : Survivra aux redémarrages et mises à jour
- ✅ **Officielle** : Utilise les mécanismes recommandés par Supabase
- ✅ **Fiable** : Pas de problèmes de permissions
- ✅ **Maintenable** : Code clair dans une Edge Function dédiée
- ✅ **Performante** : Exécution asynchrone sans bloquer l'inscription

### Edge Function déployée
L'Edge Function `handle-new-user` est déjà déployée et prête à recevoir les webhooks.
Code source : `/opt/team-dash-manager/supabase/functions/handle-new-user/index.ts`