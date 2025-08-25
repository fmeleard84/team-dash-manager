# Système de Facturation

## Vue d'ensemble
Le système de facturation permet de générer des factures hebdomadaires par projet, incluant le détail des intervenants et de leurs tâches.

## Fonctionnalités

### 1. Génération de factures
- **Période hebdomadaire** : Une facture par semaine par projet
- **Calcul automatique** : HT, TVA (20%), TTC
- **Numérotation automatique** : Format INV-2025-0001

### 2. Détails de la facture
- Liste des candidats intervenants
- Détail des tâches réalisées
- Temps passé par tâche
- Montant total par intervenant

### 3. Paiement Stripe
- Intégration Stripe (mode démo disponible)
- Marquage automatique comme payée
- Historique des paiements

### 4. Génération de données de test
Trois méthodes disponibles :

#### Méthode 1 : Interface Web
Cliquez sur le bouton "Générer des données de test" dans la section Factures du tableau de bord client.

#### Méthode 2 : Script Node.js
```bash
node generate-test-invoice.js
```

#### Méthode 3 : Edge Function
```bash
curl -X POST https://egdelmcijszuapcpglsy.supabase.co/functions/v1/create-test-invoice-data \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Structure de la base de données

### Tables principales
- `invoices` : Factures principales
- `invoice_items` : Lignes de facture par intervenant
- `time_tracking_records` : Enregistrements de temps
- `company_info` : Informations de l'entreprise

### Statuts de facture
- `draft` : Brouillon
- `sent` : Envoyée
- `paid` : Payée
- `cancelled` : Annulée
- `overdue` : En retard

## Configuration Stripe

### Mode Production
Remplacez la clé publique dans `StripePayment.tsx` :
```typescript
const STRIPE_PUBLISHABLE_KEY = 'pk_live_...';
```

### Mode Test
Utilisez le mode démo intégré pour tester sans transaction réelle.

## Utilisation

### Générer une facture
1. Accédez à l'onglet "Factures" du tableau de bord client
2. Sélectionnez un projet
3. Choisissez une période hebdomadaire
4. Cliquez sur "Générer facture"

### Consulter une facture
- Cliquez sur l'icône œil pour voir les détails
- La facture affiche :
  - Informations de l'entreprise
  - Détails du client
  - Liste des services
  - Calculs HT/TVA/TTC

### Payer une facture
1. Cliquez sur "Régler" sur une facture non payée
2. Vérifiez le montant
3. Procédez au paiement (mode démo ou Stripe)

## Export PDF
La fonctionnalité d'export PDF peut être ajoutée en utilisant des bibliothèques comme :
- jsPDF
- react-pdf
- puppeteer (côté serveur)

## Sécurité
- RLS (Row Level Security) activé
- Accès limité par rôle utilisateur
- Validation des montants côté serveur