# Système de Design Ialla - Référentiel d'Identité Visuelle

## 🎨 Palette de Couleurs

### Couleurs Principales
- **Violet Principal**: `#8b5cf6` (purple-500)
- **Rose/Magenta**: `#ec4899` (pink-500)
- **Dégradé Principal**: `from-purple-500 to-pink-500` (violet vers rose)
- **Dégradé Hover**: `from-purple-600 to-pink-600`

### Couleurs Secondaires
- **Fond Clair**: `purple-50` / `pink-50`
- **Bordures**: `purple-100` / `purple-200`
- **Texte Principal**: `gray-900`
- **Texte Secondaire**: `gray-600` / `muted-foreground`
- **Icônes**: `gray-400` / `gray-500` (icônes neutres)

### Indicateurs de Statut
- **Succès**: `green-500` / `green-100` (fond)
- **Avertissement**: `yellow-500` / `yellow-100` (fond)
- **Erreur**: `red-500` / `red-100` (fond)
- **Info**: `blue-500` / `blue-100` (fond)

## 📐 Typographie

### Titres
- **Dialog Title**: `text-2xl font-light` (titres élégants et modernes)
- **Card Title**: `text-lg font-semibold`
- **Section Title**: `text-xl font-medium`

### Corps de Texte
- **Label**: `text-sm font-medium`
- **Description**: `text-muted-foreground text-sm`
- **Body**: `text-sm` ou `text-base`

### Espacements Standards
- **Entre sections**: `space-y-6`
- **Entre éléments**: `space-y-2` ou `gap-2`
- **Padding conteneurs**: `p-4` ou `p-6`
- **Grid gaps**: `gap-6` (formulaires)

## 🎭 Composants UI

### Dialogues/Modales
```jsx
<Dialog>
  <DialogContent className="max-w-2xl shadow-xl">
    <DialogHeader className="space-y-3 pb-4 border-b">
      <DialogTitle className="text-2xl font-light">Titre</DialogTitle>
      <DialogDescription className="text-muted-foreground">
        Description
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-6 pt-6">
      {/* Contenu */}
    </div>
  </DialogContent>
</Dialog>
```

### Champs de Formulaire
```jsx
// Input avec icône
<div className="space-y-2">
  <Label className="text-sm font-medium">Label</Label>
  <div className="relative">
    <IconName className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
    <Input className="h-10 pl-10" placeholder="Placeholder..." />
  </div>
</div>
```

### Boutons CTA
```jsx
// Bouton principal avec dégradé
<Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg">
  Action
</Button>

// Bouton secondaire
<Button variant="outline" className="border-purple-200 hover:bg-purple-50">
  Annuler
</Button>
```

### Sélecteurs d'Équipe (Uniformisé)
```jsx
// Affichage des membres sélectionnés
<div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
  {members.map(member => (
    <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-full border">
      <Avatar className="w-5 h-5">
        <AvatarFallback className="text-[10px] bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          {getInitials(member.name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm">{member.name}</span>
      <Button className="ml-1 h-4 w-4 p-0">
        <X className="w-3 h-3" />
      </Button>
    </div>
  ))}
</div>

// Sélecteur pour ajouter
<Select>
  <SelectTrigger className="h-10">
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-gray-400" />
      <SelectValue placeholder="Ajouter un membre" />
    </div>
  </SelectTrigger>
  <SelectContent>
    {availableMembers.map(member => {
      const firstName = member.name.split(' ')[0];
      const initials = firstName.substring(0, 2).toUpperCase();
      return (
        <SelectItem value={member.id}>
          <div className="flex items-center gap-3">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{member.name}</span>
              <span className="text-xs text-gray-500">{member.role}</span>
            </div>
          </div>
        </SelectItem>
      );
    })}
  </SelectContent>
</Select>
```

### Cards et Conteneurs
```jsx
// Card avec ombre douce
<Card className="shadow-lg hover:shadow-xl transition-shadow border-purple-100">
  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
    {/* Header content */}
  </CardHeader>
  <CardContent>
    {/* Body content */}
  </CardContent>
</Card>
```

## 🎯 Règles de Design

### Ombres
- **Ombres douces**: `shadow-lg` pour les cards principales
- **Hover**: `hover:shadow-xl` pour l'interaction
- **Dialogues**: `shadow-xl` toujours présent

### Bordures et Arrondis
- **Bordures**: Toujours subtiles avec `border-purple-100` ou `border-gray-200`
- **Arrondis standards**: `rounded-lg`
- **Arrondis forts**: `rounded-xl` pour éléments importants
- **Pills/Badges**: `rounded-full`

### Icônes
- **Taille standard**: `w-4 h-4`
- **Couleur par défaut**: `text-gray-400` ou `text-gray-500`
- **Position dans inputs**: `absolute left-3 top-1/2 transform -translate-y-1/2`
- **Jamais d'emojis** dans l'interface professionnelle

### États et Interactions
- **Hover sur boutons**: Assombrir le dégradé ou ajouter `hover:bg-purple-50`
- **Focus**: Utiliser les bordures purple
- **Disabled**: Opacity réduite avec `opacity-50`
- **Transitions**: Toujours `transition-all` ou spécifique

### Avatars Utilisateurs
- **Taille standard**: `w-5 h-5` dans les listes
- **Fallback**: Initiales sur fond dégradé violet-rose
- **Format initiales**: 2 premières lettres du prénom ou premières lettres prénom+nom
- **Ring on hover**: `ring-2 ring-purple-300`

## 📱 Layouts et Espacements

### Grilles de Formulaires
- **2 colonnes**: `grid grid-cols-2 gap-6`
- **Labels**: Toujours au-dessus avec `space-y-2`
- **Hauteur inputs**: Uniforme à `h-10`

### Sections
- **Header de section**: Bordure bottom avec `pb-4 border-b`
- **Espacement sections**: `space-y-6` ou `pt-6`
- **Footer de dialogue**: `pt-4 border-t` avec boutons alignés à droite

## ✨ Effets Spéciaux

### Dégradés Subtils
- **Backgrounds**: `bg-gradient-to-br from-white to-purple-50/30`
- **Headers**: `bg-gradient-to-r from-purple-50 to-pink-50`
- **Progress bars**: `bg-gradient-to-r from-purple-400 to-pink-400`

### Animations
- **Scale on hover**: `hover:scale-[1.02]`
- **Translate on hover**: `hover:-translate-y-1`
- **Duration**: `duration-200` ou `duration-300`

## ⭐ Système de Notation

### Concept
Lorsqu'une tâche passe en état "Finalisé", le client est invité à noter la qualité du livrable :
- **Note**: 1 à 5 étoiles
- **Commentaire**: Optionnel
- **Impact**: Influence le tarif horaire du candidat

### États de Tâche
```jsx
// Les 4 états principaux
const TaskStatus = {
  TODO: 'À faire',        // todo
  IN_PROGRESS: 'En cours', // in_progress
  TO_VALIDATE: 'À valider', // review
  COMPLETED: 'Finalisé'    // done
}
```

### Composant de Notation
```jsx
<Dialog>
  <DialogContent className="max-w-md shadow-xl">
    <DialogHeader className="space-y-3 pb-4 border-b">
      <DialogTitle className="text-2xl font-light">Noter le livrable</DialogTitle>
      <DialogDescription>
        Merci d'évaluer la qualité de cette tâche
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 pt-6">
      {/* Étoiles cliquables */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button className="group">
            <Star className={`w-8 h-8 transition-all ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300 hover:text-yellow-400'
            }`} />
          </button>
        ))}
      </div>
      {/* Commentaire */}
      <Textarea 
        placeholder="Commentaire optionnel..." 
        className="min-h-[80px]" 
      />
      {/* CTA */}
      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
        Valider la notation
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### Affichage de la Note Moyenne
```jsx
// Dans le profil candidat
<div className="flex items-center gap-2">
  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
  <span className="font-semibold">{averageRating.toFixed(1)}</span>
  <span className="text-sm text-gray-500">({totalRatings} avis)</span>
</div>
```

### Structure Base de Données
```sql
-- Table des notations
task_ratings {
  id: uuid
  task_id: uuid (ref: kanban_cards.id)
  project_id: uuid (ref: projects.id)
  candidate_id: uuid (ref: candidate_profiles.id)
  client_id: uuid (ref: profiles.id)
  rating: integer (1-5)
  comment: text (optional)
  created_at: timestamp
}

-- Vue pour la moyenne par candidat
candidate_ratings_summary {
  candidate_id: uuid
  average_rating: decimal(3,2)
  total_ratings: integer
  last_rating_date: timestamp
}
```

## 🚫 À Éviter

- ❌ Icônes colorées ou emojis dans l'UI professionnelle
- ❌ Couleurs criardes ou trop saturées
- ❌ Bordures épaisses ou trop visibles
- ❌ Textes trop petits (minimum `text-xs`)
- ❌ Manque de cohérence dans les espacements
- ❌ Mélange de styles (modern vs old-school)
- ❌ Badges avec couleurs de fond trop vives