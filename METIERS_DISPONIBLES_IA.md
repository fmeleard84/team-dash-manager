# Configuration Métiers pour l'IA

## Métiers disponibles dans le système

L'IA doit TOUJOURS utiliser uniquement les métiers présents dans la base de données via la table `hr_profiles`.
Les métiers sont chargés dynamiquement via le `expertiseProvider`.

## Séniorités valides

**IMPORTANT**: L'IA doit mapper les séniorités comme suit :
- `junior` → `junior`
- `medior` ou `médior` → `intermediate` 
- `intermédiaire` → `intermediate`
- `senior` → `senior`
- `expert` → `senior`
- `principal` → `senior`

La base de données n'accepte QUE : `junior`, `intermediate`, `senior`

## Processus de validation

1. **Métier** : Vérifier que le métier existe dans `hr_profiles`
2. **Séniorité** : Normaliser selon le mapping ci-dessus
3. **Langues** : Valider contre `hr_languages`
4. **Expertises** : Valider contre `hr_expertises` du métier spécifique

## Gestion des erreurs

Si une expertise demandée n'existe pas :
- L'IA doit suggérer des expertises proches du même métier
- Ne JAMAIS créer de nouvelles expertises
- Ne JAMAIS utiliser d'expertises d'autres métiers

## Exemple de flux

```
Demande : "Chef de projet avec expertise Agile"
↓
1. Recherche métier "Chef de projet" → Trouve "Chef de projet marketing"
2. Recherche expertise "Agile" dans ce métier → Non trouvée
3. Suggérer les expertises disponibles : "Google Ads", "SEO", "Social Media", "Content Marketing"
4. Demander confirmation ou utiliser les expertises disponibles
```

## Instructions pour l'IA

- TOUJOURS charger les données via `expertiseProvider.loadData()`
- TOUJOURS valider avec `expertiseProvider.validateProfile()`
- TOUJOURS normaliser la séniorité avec `expertiseProvider.normalizeSeniority()`
- JAMAIS créer de métiers ou expertises non existants
- TOUJOURS suggérer des alternatives si non trouvé