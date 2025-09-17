# 🔧 Résolution du problème SMTP Supabase

## ⚠️ Problème identifié
Les emails viennent toujours de `noreply@mail.app.supabase.io` au lieu de `hello@vaya.rip` via Brevo.

## ✅ Solution - Vérifier ces points dans l'ordre :

### 1. Activer Custom SMTP (CRUCIAL)
Dans **Authentication → Email Templates → SMTP Settings** :

1. **TRÈS IMPORTANT** : La case **"Enable Custom SMTP"** doit être **COCHÉE** ☑️
   - Si elle n'est pas cochée, Supabase ignore tous les paramètres SMTP
   - Même si les champs sont remplis, ils ne sont pas utilisés sans cette case

2. Après avoir coché la case, **SAUVEGARDER** en bas de page

3. **Attendre 2-3 minutes** pour la propagation

### 2. Vérifier le mot de passe SMTP Brevo
Le mot de passe n'est PAS votre mot de passe Brevo, mais une **clé SMTP spécifique** :

1. Se connecter sur https://app.brevo.com
2. Aller dans **SMTP & API** → **SMTP**
3. Cliquer sur **"Generate a new SMTP key"**
4. Copier cette clé (format : `xsmtpsib-xxxxxxxxxxxxx`)
5. La coller dans le champ Password de Supabase

### 3. Configuration complète à vérifier

```
☑️ Enable Custom SMTP (CASE À COCHER OBLIGATOIRE)

Sender email: hello@vaya.rip
Sender name: La Team Vaya

Host: smtp-relay.brevo.com
Port: 587
Username: fmeleard@gmail.com
Password: [Clé SMTP Brevo, PAS le mot de passe]
Minimum interval: 60 seconds
```

### 4. Test après configuration

1. **Sauvegarder** tous les paramètres
2. **Rafraîchir** la page (F5)
3. **Vérifier** que "Enable Custom SMTP" est toujours coché
4. Créer un nouveau compte test
5. L'email devrait maintenant venir de `hello@vaya.rip`

## 🐛 Debugging si ça ne fonctionne toujours pas

### Option A : Tester avec un autre port
Si le port 587 ne fonctionne pas, essayer :
- Port **2525** (alternatif pour Brevo)
- Port **465** (SSL/TLS)

### Option B : Vérifier le domaine dans Brevo
1. Dans Brevo, aller dans **Senders & IP**
2. Vérifier que `vaya.rip` est un domaine vérifié
3. Si non, ajouter et vérifier le domaine

### Option C : Logs Supabase
Dans le dashboard Supabase :
1. Aller dans **Logs** → **Auth Logs**
2. Filtrer par "email"
3. Chercher des erreurs SMTP

## 📝 Note importante

Le fait que le **design du template fonctionne** mais que l'email vienne toujours de Supabase confirme que :
- ✅ Les templates sont bien configurés
- ❌ Le SMTP custom n'est pas activé

**La case "Enable Custom SMTP" est la clé !**

## 🚀 Actions immédiates

1. Retourner sur https://supabase.com/dashboard/project/nlesrzepybeeghghjafc/settings/auth
2. Aller dans **Email Templates** → **SMTP Settings**
3. **COCHER** "Enable Custom SMTP" si ce n'est pas fait
4. **SAUVEGARDER**
5. Attendre 2 minutes
6. Tester avec un nouveau compte