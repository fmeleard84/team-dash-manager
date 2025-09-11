# 🔑 Configuration de la Clé OpenAI pour les Edge Functions

## Situation Actuelle

Vous utilisez déjà la clé OpenAI dans votre application :
- **Stockage actuel** : `localStorage` (côté client)
- **Utilisation** : Bot audio dans le header client
- **Problème** : Les Edge Functions (côté serveur) ne peuvent pas accéder au localStorage

## Solution : Ajouter la clé dans Supabase

### Étape 1 : Récupérer votre clé actuelle

1. Ouvrez votre application dans le navigateur
2. Ouvrez la console (F12)
3. Tapez :
```javascript
localStorage.getItem('openai_api_key')
```
4. Copiez la clé qui s'affiche (commence par `sk-...`)

### Étape 2 : Ajouter dans Supabase Dashboard

1. **Allez dans le Dashboard Supabase**
   ```
   https://supabase.com/dashboard/project/egdelmcijszuapcpglsy
   ```

2. **Naviguez vers les Edge Functions**
   - Menu gauche : **Settings** (icône engrenage)
   - Puis : **Edge Functions**

3. **Ajoutez la clé dans Secrets**
   - Section : **Environment Variables**
   - Cliquez : **+ Add new secret**
   - **Name** : `OPENAI_API_KEY`
   - **Value** : `sk-...` (votre clé)
   - Cliquez : **Save**

## Pourquoi cette duplication ?

- **Client (localStorage)** : Pour le bot audio en temps réel
- **Serveur (Secrets Supabase)** : Pour générer les embeddings

Les deux utilisent la même clé mais dans des contextes différents :
- Client → API OpenAI Realtime (voix)
- Serveur → API OpenAI Embeddings (vectorisation)

## Vérification

Une fois configurée, testez avec :

```bash
curl -X POST https://egdelmcijszuapcpglsy.supabase.co/functions/v1/process-embedding-queue \
  -H "Authorization: Bearer [VOTRE_ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

Si la réponse contient `"openai_configured": true`, c'est bon !

## Sécurité

- ✅ La clé dans Supabase Secrets est sécurisée (côté serveur uniquement)
- ⚠️ La clé dans localStorage est visible côté client
- 💡 Pour production : Considérez un proxy pour cacher la clé client

## Coûts

Avec la même clé, vous paierez pour :
- **Realtime API** : ~$0.06/minute de conversation
- **Embeddings API** : ~$0.02/1M tokens (négligeable)

Total estimé : < $10/mois pour usage normal