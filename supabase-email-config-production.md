# Configuration Email Supabase Production

## 🔧 Configuration à effectuer dans le Dashboard Supabase

### 1. Accéder aux paramètres Email
1. Aller sur : https://supabase.com/dashboard/project/nlesrzepybeeghghjafc/settings/auth
2. Cliquer sur "Email Templates" dans le menu de gauche

### 2. Configurer Brevo SMTP
Dans la section **SMTP Settings** :

```
SMTP Host: smtp-relay.brevo.com
SMTP Port: 587
SMTP Username: [Votre login Brevo]
SMTP Password: [Votre clé API SMTP Brevo]
Sender Email: noreply@vaya.rip
Sender Name: Vaya Team
```

### 3. Corriger les URLs de redirection
Dans **Authentication → URL Configuration** :

#### Site URL
```
https://vaya.rip
```

#### Redirect URLs (ajouter toutes ces URLs)
```
https://vaya.rip
https://vaya.rip/auth/callback
https://vaya.rip/#/auth/callback
http://vaya.rip
http://vaya.rip/auth/callback
```

### 4. Templates d'email
Dans **Email Templates**, personnaliser le template de confirmation :

#### Confirm signup
```html
<h2>Bienvenue sur Vaya !</h2>
<p>Bonjour {{ .Email }},</p>
<p>Merci de vous être inscrit sur Vaya. Pour confirmer votre inscription, cliquez sur le lien ci-dessous :</p>
<p><a href="{{ .ConfirmationURL }}">Confirmer mon inscription</a></p>
<p>Ou copiez ce lien dans votre navigateur :</p>
<p>{{ .ConfirmationURL }}</p>
<br/>
<p>L'équipe Vaya</p>
```

### 5. Vérifier les clés API Brevo

Les clés API Brevo doivent être configurées dans les **Secrets** de Supabase :
1. Aller dans Edge Functions → Secrets
2. Vérifier/Ajouter :
   - `BREVO_API_KEY` : Votre clé API Brevo
   - `BREVO_SENDER_EMAIL` : noreply@vaya.rip
   - `BREVO_SENDER_NAME` : Vaya Team

### 6. Activer Custom SMTP
⚠️ **IMPORTANT** : Cocher la case **"Enable Custom SMTP"** pour utiliser Brevo au lieu des emails Supabase par défaut.

## 📝 Vérification

Pour vérifier que la configuration est correcte :
1. Créer un compte test
2. L'email doit venir de **noreply@vaya.rip** (pas de noreply@mail.app.supabase.io)
3. Le lien de confirmation doit rediriger vers **https://vaya.rip** (pas vers l'IP avec port)

## 🚨 Problèmes courants

### Email vient toujours de Supabase
→ Vérifier que "Enable Custom SMTP" est bien coché

### Lien redirige vers IP:8081
→ Vérifier que Site URL est bien configuré sur https://vaya.rip

### Email non reçu
→ Vérifier les credentials Brevo et le sender email autorisé

## 📧 Informations Brevo

Pour obtenir vos credentials Brevo :
1. Se connecter sur https://app.brevo.com
2. Aller dans SMTP & API → SMTP
3. Récupérer :
   - SMTP server: smtp-relay.brevo.com
   - Port: 587
   - Login: Votre email Brevo
   - Password: Votre clé SMTP (pas la clé API)