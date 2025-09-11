# 🎨 Guidelines Design Néon - Team Dash Manager

## 🌈 Palette de Couleurs

### Fonds Principaux
```css
/* Background principal avec gradient sombre */
bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81]

/* Overlay glassmorphism */
bg-black/40 backdrop-blur-xl
```

### Gradients d'Accent
```css
/* Gradient principal purple/pink/blue */
bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600

/* Gradient accent purple/pink */
bg-gradient-to-r from-purple-500 to-pink-500

/* Gradient success green/emerald */
bg-gradient-to-r from-green-500 to-emerald-500

/* Gradient pour boutons/éléments actifs */
bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500
```

### Bordures et Effets
```css
/* Bordure néon avec glow */
border-purple-500/30
shadow-lg shadow-purple-500/40

/* Bordure subtile */
border-purple-500/20
border-white/20
```

## 🎭 Composants Standards

### Cards/Containers
```jsx
/* Container principal avec bordure néon */
<Card className="border-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-[1px] rounded-2xl shadow-2xl shadow-purple-500/25">
  <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-2xl">
    {/* Contenu */}
  </div>
</Card>

/* Container avec glassmorphism */
<div className="bg-black/40 backdrop-blur-xl rounded-2xl">
  {/* Contenu */}
</div>
```

### Headers
```jsx
/* Header avec gradient */
<div className="border-b border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm p-6">
  {/* Titre et contrôles */}
</div>
```

### Boutons
```jsx
/* Bouton primaire avec gradient */
<Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/40 text-white border-0">
  Action
</Button>

/* Bouton secondaire glassmorphism */
<Button className="bg-white/10 hover:bg-white/20 border border-purple-500/30 text-white backdrop-blur-sm">
  Action
</Button>
```

### Badges
```jsx
<Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg shadow-purple-500/40">
  Label
</Badge>
```

### Inputs/Select
```jsx
/* Input avec style néon */
<Input className="bg-white/10 border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400" />

/* Select avec style néon */
<SelectTrigger className="bg-white/10 border-purple-500/30 text-white hover:bg-white/20">
  <SelectValue />
</SelectTrigger>
<SelectContent className="bg-[#1e1b4b] border-purple-500/30">
  {/* Options */}
</SelectContent>
```

### Icônes Animées
```jsx
/* Icône avec effet pulse néon */
<div className="relative">
  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-70 animate-pulse" />
  <div className="relative w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-2xl">
    <Icon className="w-7 h-7 text-white" />
  </div>
</div>
```

## 🎬 Animations (Framer Motion)

```jsx
import { motion } from 'framer-motion';

/* Hover scale */
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>

/* Fade in */
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>

/* Slide in */
<motion.div
  initial={{ x: -20, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{ duration: 0.3 }}
>
```

## 📏 Spacing & Layout

- Utiliser `rounded-2xl` pour les containers principaux
- Utiliser `rounded-xl` ou `rounded-lg` pour les éléments internes
- Padding standard: `p-6` pour les containers, `p-4` pour les sections
- Gap standard: `gap-4` ou `gap-6` entre éléments

## 🎯 Règles d'Application

1. **Toujours** utiliser des fonds sombres avec gradients
2. **Toujours** ajouter du glassmorphism sur les overlays
3. **Toujours** utiliser des bordures avec transparence (20-30%)
4. **Toujours** ajouter des shadows colorées sur les éléments importants
5. **Jamais** utiliser de blanc pur - préférer white/90 ou white/80
6. **Jamais** utiliser de noir pur - préférer black/40 ou black/60

## 🔧 Classes Utilitaires Custom

```css
/* Effet glow néon */
.neon-glow {
  @apply shadow-2xl shadow-purple-500/25;
}

/* Background glassmorphism */
.glass-bg {
  @apply bg-black/40 backdrop-blur-xl;
}

/* Bordure néon */
.neon-border {
  @apply border border-purple-500/30;
}
```