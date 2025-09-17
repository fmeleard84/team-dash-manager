# 📧 Configuration des Templates Email dans Supabase

## 🎨 Template de Confirmation d'Email

### 1. Accéder aux paramètres
1. Aller sur : https://supabase.com/dashboard/project/nlesrzepybeeghghjafc/settings/auth
2. Cliquer sur **"Email Templates"** dans le menu de gauche

### 2. Configurer le template "Confirm signup"

Dans la section **Confirm signup**, remplacer le template par défaut par le contenu HTML du fichier `confirmation-email.html`.

### 3. Variables disponibles

Les variables Supabase suivantes sont automatiquement remplacées :
- `{{ .Email }}` - L'adresse email de l'utilisateur
- `{{ .ConfirmationURL }}` - Le lien de confirmation
- `{{ .Token }}` - Le token de confirmation (si besoin)
- `{{ .TokenHash }}` - Le hash du token (si besoin)
- `{{ .SiteURL }}` - L'URL du site (https://vaya.rip)

### 4. Design du template

Le template utilise :
- **Gradients** : Violet (#a855f7) vers Rose (#ec4899) - couleurs de votre charte
- **Card glassmorphism** : Fond blanc semi-transparent avec ombre
- **Bouton néon** : Effet de shadow coloré sur le CTA principal
- **Responsive** : Compatible mobile et desktop
- **Dark-friendly** : Fonctionne bien sur clients email dark mode

### 5. Autres templates à configurer

Vous pouvez adapter le même design pour :
- **Invite user** : Invitation d'utilisateur
- **Magic Link** : Connexion sans mot de passe
- **Change Email Address** : Changement d'email
- **Reset Password** : Réinitialisation de mot de passe

### 6. Test du template

Pour tester :
1. Sauvegarder le template dans Supabase
2. Créer un compte test
3. Vérifier que l'email reçu a bien le nouveau design

### 7. Template simplifié (si problème d'affichage)

Si certains clients email n'affichent pas correctement le template, voici une version simplifiée :

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #a855f7, #ec4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">VAYA</h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333;">Bienvenue sur Vaya !</h2>
    <p style="color: #666;">Bonjour {{ .Email }},</p>
    <p style="color: #666;">Merci de vous être inscrit. Cliquez sur le lien ci-dessous pour confirmer votre email :</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #a855f7, #ec4899); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
        Confirmer mon inscription
      </a>
    </div>

    <p style="color: #999; font-size: 14px;">Si le bouton ne fonctionne pas, copiez ce lien :</p>
    <p style="color: #a855f7; font-size: 14px; word-break: break-all;">{{ .ConfirmationURL }}</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    © 2025 Vaya. Tous droits réservés.
  </div>
</div>
```

### 8. Notes importantes

- **Pas de JavaScript** : Les emails ne supportent pas le JS
- **CSS inline uniquement** : Pas de `<style>` tags dans certains clients
- **Images** : Éviter les images de fond, utiliser des gradients CSS
- **Largeur max** : 600px pour compatibilité mobile
- **Test** : Toujours tester sur Gmail, Outlook, et mobile