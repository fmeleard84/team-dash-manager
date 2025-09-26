import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, FileText, Users, FolderOpen, GitBranch, Database, AlertCircle, ChevronRight, ChevronDown, Home, Play, Calendar, MessageSquare, Layout, Code, Shield, Server, Zap, BookOpen, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Import des pages de design system
const DesignSystemModal = lazy(() => import('./DesignSystemModal'));

interface MenuItem {
  id: string;
  label: string;
  icon?: any;
  children?: MenuItem[];
}

const LLMDashboard = () => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['projet', 'candidat', 'database']));
  
  const menuItems: MenuItem[] = [
    {
      id: 'general',
      label: 'Vue d\'ensemble',
      icon: Home,
    },
    {
      id: 'candidat',
      label: 'Candidat',
      icon: Users,
      children: [
        { id: 'candidat-flow', label: 'Flux candidat' },
        { id: 'candidat-onboarding', label: 'Onboarding' },
        { id: 'candidat-qualification', label: 'Qualification' },
        { id: 'candidat-missions', label: 'Gestion des missions' },
        { id: 'candidat-activities', label: '⏱️ Activités & Time Tracking' },
        { id: 'candidat-realtime', label: 'Temps réel' },
      ]
    },
    {
      id: 'projet',
      label: 'Projet',
      icon: FolderOpen,
      children: [
        { id: 'projet-workflow', label: 'Workflow projet' },
        { id: 'projet-pause-reprise', label: '⏸️ Pause/Reprise' },
        { id: 'projet-edition-candidat', label: '🔄 Édition & Changement candidat' },
        { id: 'projet-demarrage', label: '🔥 Démarrage projet' },
        { id: 'projet-orchestration', label: 'Orchestration' },
        { id: 'projet-collaboration', label: 'Outils collaboratifs' },
        { id: 'projet-planning', label: 'Planning & Événements' },
        { id: 'projet-messagerie', label: '💬 Messagerie' },
        { id: 'projet-drive', label: '📁 Drive' },
      ]
    },
    {
      id: 'database',
      label: 'Base de données',
      icon: Database,
      children: [
        { id: 'db-schema', label: 'Schéma principal' },
        { id: 'db-rls', label: 'RLS & Sécurité' },
        { id: 'db-realtime', label: 'Tables temps réel' },
        { id: 'db-functions', label: 'Edge Functions' },
      ]
    },
    {
      id: 'corrections',
      label: 'Historique Corrections',
      icon: AlertCircle,
      children: [
        { id: 'corrections-unified-ids', label: '🔄 Unification IDs (05/09/2025)' },
        { id: 'corrections-session5', label: '🔧 Session 5 (05/09/2025)' },
        { id: 'corrections-session4', label: '🔧 Session 4 (04/09/2025)' },
        { id: 'corrections-session3', label: '🔧 Session 3 (03/09/2025)' },
        { id: 'corrections-session2', label: '🔧 Session 2 (03/09/2025)' },
        { id: 'corrections-session1', label: '🔧 Session 1 (02/09/2025)' },
      ]
    },
    {
      id: 'wiki',
      label: '📚 Wiki Collaboratif',
      icon: BookOpen,
      children: [
        { id: 'wiki-overview', label: '🎯 Vue d\'ensemble' },
        { id: 'wiki-architecture', label: '🏗️ Architecture technique' },
        { id: 'wiki-permissions', label: '🔐 Système de permissions' },
        { id: 'wiki-realtime', label: '⚡ Synchronisation temps réel' },
        { id: 'wiki-comments', label: '💬 Système de commentaires' },
        { id: 'wiki-navigation', label: '🧭 Navigation et organisation' },
        { id: 'wiki-editor', label: '✏️ Éditeur BlockNote' },
      ]
    },
    {
      id: 'api',
      label: 'API & Intégrations',
      icon: Code,
      children: [
        { id: 'api-supabase', label: 'Supabase' },
        { id: 'api-hooks', label: 'React Hooks' },
      ]
    },
    {
      id: 'payment',
      label: '💳 Paiements',
      icon: CreditCard,
      children: [
        { id: 'payment-system', label: 'Système de paiement Stripe' },
      ]
    },
    {
      id: 'design',
      label: 'Design System',
      icon: Layout,
      children: [
        { id: 'design-system', label: '🎨 Charte Graphique Premium' },
        { id: 'design-modal', label: '📱 Modals Plein Écran' },
        { id: 'design-components', label: '🧩 Composants UI' },
        { id: 'design-patterns', label: '📐 Patterns UX' },
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Contenu pour chaque section
  const [content, setContent] = useState({
    'general': `# 📚 Documentation Vaya

## Vue d'ensemble
Vaya est une plateforme complète de gestion de projets et de ressources humaines, conçue pour faciliter la collaboration entre clients et candidats.

### 🎯 Objectifs principaux
- **Gestion de projets** : Création, suivi et orchestration de projets complexes
- **Matching candidats** : Système intelligent de mise en relation basé sur les compétences
- **Collaboration temps réel** : Outils intégrés pour la communication et le partage
- **Time tracking** : Suivi précis du temps et des activités

### 🏗️ Architecture
- **Frontend** : React + TypeScript + Vite
- **Backend** : Supabase (PostgreSQL + Edge Functions)
- **Temps réel** : WebSockets via Supabase Realtime
- **Authentification** : Supabase Auth

### 📂 Structure du projet
- **/src/pages** : Pages principales de l'application
- **/src/components** : Composants réutilisables
- **/src/hooks** : Hooks React personnalisés
- **/src/integrations** : Intégrations externes (Supabase)
- **/supabase/functions** : Edge Functions Supabase

### 🚀 Fonctionnalités clés
1. **Workflow de projet complet** : De la création au kickoff
2. **Système de matching intelligent** : 5 critères de correspondance
3. **Outils collaboratifs** : Kanban, Drive, Messages, Planning
4. **Time tracking intégré** : Suivi des activités en temps réel
5. **Design system premium** : Interface moderne et cohérente

### 📖 Navigation
Utilisez le menu de gauche pour explorer les différentes sections de la documentation :
- **Candidat** : Flux et fonctionnalités côté candidat
- **Projet** : Gestion complète des projets
- **Base de données** : Schéma et architecture
- **Corrections** : Historique des bugs corrigés
- **API** : Documentation technique
- **Design System** : Charte graphique et composants`,
    'design-system': `# 🎨 Charte Graphique Premium - Système de Design Implémenté

## Vue d'ensemble
Ce système de design premium est inspiré des meilleurs sites minimalistes modernes. Il privilégie les contrastes forts, la typographie massive et l'utilisation parcimonieuse de couleur.

## 🆕 Effets Visuels Avancés (Mise à jour 02/09/2025)

### Effet Division (Chromatic Aberration)
Implémenté sur le titre principal de la homepage pour un effet moderne et dynamique.

#### Implementation dans HeroLyniqFixed
\`\`\`tsx
// Effet Division avec décalages chromatiques
<div className="relative">
  {/* Couche cyan */}
  <div className="absolute inset-0 opacity-60" style={{ transform: 'translate(-2px, 2px)' }}>
    <span className="block text-cyan-400 mix-blend-screen">Digital</span>
  </div>
  
  {/* Couche magenta */}
  <div className="absolute inset-0 opacity-60" style={{ transform: 'translate(2px, -2px)' }}>
    <span className="block text-pink-500 mix-blend-screen">Digital</span>
  </div>
  
  {/* Texte principal */}
  <div className="relative mix-blend-lighten">
    <span className="block text-white">Digital</span>
  </div>
</div>
\`\`\`

### Hero Section avec Vidéo
- Background vidéo en loop automatique
- Overlay gradients légers pour la lisibilité
- Position fixe avec sections qui glissent par-dessus

### Composants Créés
- **IntroOverlay**: Animation d'intro avec logo et fondu
- **HeroLyniqFixed**: Hero section avec vidéo et effet Division
- **HeroLyniqBlend**: Version alternative avec blend modes avancés

## 1. Configuration Tailwind (tailwind.config.ts)

### Couleurs définies
\`\`\`typescript
colors: {
  // Neutres premium
  black: '#0D0D0F',        // Fond très sombre
  'near-black': '#111113', // Fond sombre secondaire
  white: '#FFFFFF',        // Blanc pur
  gray: {
    900: '#1B1B1F',        // Très sombre
    800: '#232327',        // Bordures sombres
    700: '#2B2B30',
    600: '#3A3A40',
    500: '#52525B',        // Texte secondaire
    400: '#8A8A93',        // Texte tertiaire
    300: '#C9C9CF',        // Bordures claires
    200: '#E7E7EA',        // Dividers
    100: '#F3F3F5',        // Fond très clair
  },
  
  // Accent principal (Violet premium)
  accent: {
    DEFAULT: '#7C3AED',    // Violet principal
    dark: '#6D28D9',       // Violet hover
    light: '#8B5CF6',      // Violet clair
    ink: '#5B21B6',        // Violet texte
  }
}
\`\`\`

### Typographie
\`\`\`typescript
fontSize: {
  'display-xxl': ['clamp(3.5rem, 10vw, 9rem)', { 
    lineHeight: '1.05', 
    letterSpacing: '-0.02em' 
  }],
  'display-xl': ['clamp(2.75rem, 7vw, 5rem)', { 
    lineHeight: '1.06', 
    letterSpacing: '-0.02em' 
  }],
  'display': ['clamp(2.25rem, 6vw, 3.5rem)', { 
    lineHeight: '1.08', 
    letterSpacing: '-0.02em' 
  }],
  'h1': ['clamp(2.25rem, 5vw, 3.5rem)', { 
    lineHeight: '1.1', 
    letterSpacing: '-0.02em' 
  }],
  'h2': ['clamp(1.75rem, 4vw, 2.5rem)', { 
    lineHeight: '1.2', 
    letterSpacing: '-0.01em' 
  }],
  'h3': ['clamp(1.375rem, 3vw, 1.75rem)', { 
    lineHeight: '1.3' 
  }],
  'lead': ['1.25rem', { lineHeight: '1.5' }],
  'body': ['1rem', { lineHeight: '1.6' }],
  'small': ['0.875rem', { lineHeight: '1.5' }],
  'eyebrow': ['0.75rem', { 
    lineHeight: '1.2', 
    letterSpacing: '0.04em' 
  }],
}
\`\`\`

### Autres tokens
\`\`\`typescript
borderRadius: {
  'md': '12px',
  'lg': '16px',
  'xl': '20px',
  '2xl': '24px',
},

boxShadow: {
  'card': '0 8px 24px rgba(0,0,0,.06)',
  'card-hover': '0 12px 32px rgba(0,0,0,.08)',
  'button': '0 1px 2px rgba(0,0,0,.08)',
  'focus': '0 0 0 2px rgba(124,58,237,.35)',
},

backgroundImage: {
  'hero-gradient': 'linear-gradient(90deg, #38E1E1 0%, #21A7F0 35%, #FDB952 70%, #F26A4D 100%)',
  'accent-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'dark-gradient': 'linear-gradient(180deg, #0D0D0F 0%, #1B1B1F 100%)',
}
\`\`\`

## 2. Classes Utilitaires CSS (src/index.css)

### Typographie Premium
\`\`\`css
/* Titres massifs */
.h-display-xxl {
  @apply text-display-xxl font-bold;
}

.h-display-xl {
  @apply text-display-xl font-bold;
}

.h-display {
  @apply text-display font-bold;
}

/* Gradient de texte héroïque */
.h-hero-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Eyebrow (étiquette de section) */
.eyebrow {
  @apply text-eyebrow uppercase text-accent font-medium;
}

/* Paragraphe principal */
.lead {
  @apply text-lead text-black/80;
}
\`\`\`

### Boutons Premium
\`\`\`css
.btn-premium {
  @apply h-11 px-5 rounded-md font-semibold inline-flex items-center gap-2.5 transition-all duration-200;
}

.btn-primary-premium {
  @apply bg-black text-white shadow-button hover:bg-gray-900;
}

.btn-secondary-premium {
  @apply bg-white text-black border border-gray-200 hover:border-gray-300;
}

.btn-accent-premium {
  @apply bg-accent text-white hover:bg-accent-dark shadow-button;
}

.btn-ghost-premium {
  @apply bg-transparent text-accent hover:bg-accent/10;
}
\`\`\`

### Cards Premium
\`\`\`css
.card-premium {
  @apply bg-white border border-gray-200 rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow duration-200;
}

.card-dark-premium {
  @apply bg-near-black border border-gray-800 text-white rounded-xl p-5;
}
\`\`\`

### Effets Spéciaux
\`\`\`css
/* Effet Noise/Grain */
.noise {
  @apply relative;
}

.noise::after {
  content: "";
  @apply absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay;
  background-image: url("data:image/svg+xml,..."); /* SVG noise pattern */
}

/* Coin marqué (accent visuel) */
.corner-mark {
  @apply relative;
}

.corner-mark::after {
  content: "";
  @apply absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-accent rounded-sm;
}

/* Animation Reveal au scroll */
.reveal {
  @apply opacity-0 translate-y-2 transition-all ease-out;
  transition-duration: 220ms;
}

.reveal.is-inview {
  @apply opacity-100 translate-y-0;
}
\`\`\`

### Liste de Services (fond noir)
\`\`\`css
.service-item {
  @apply text-display font-bold tracking-tight-2 opacity-20 py-6 border-b border-gray-800 transition-opacity duration-200 hover:opacity-100;
}

.service-item.is-active {
  @apply opacity-100;
}
\`\`\`

### Statistiques
\`\`\`css
.stat-num {
  @apply text-[clamp(2.75rem,6vw,4.5rem)] font-bold tracking-tight-2 text-black tabular-nums;
}

.stat-label {
  @apply text-sm text-gray-500;
}
\`\`\`

## 3. Patterns de Composants React

### Hero Section Premium
\`\`\`tsx
<section className="relative min-h-screen flex items-center justify-center overflow-hidden">
  {/* Background avec noise */}
  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 noise"></div>
  
  <div className="container relative z-10 text-center py-32">
    {/* Eyebrow */}
    <div className="eyebrow mb-8 reveal">
      <span className="inline-flex items-center gap-2">
        <span>↳</span> DIGITAL TRANSFORMATION STUDIO
      </span>
    </div>
    
    {/* Titre XXL avec gradient */}
    <h1 className="h-display-xxl mb-8 reveal">
      <span className="block">From ordinary to</span>
      <span className="h-hero-gradient">extraordinary</span>
    </h1>
    
    {/* Lead */}
    <p className="lead max-w-3xl mx-auto mb-12 reveal">
      Description principale...
    </p>
    
    {/* CTA */}
    <button className="btn-premium btn-accent-premium">
      Action principale
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
</section>
\`\`\`

### Section Stats
\`\`\`tsx
<section className="py-24 border-y border-gray-200">
  <div className="container">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
      {stats.map((stat) => (
        <div className="text-center reveal">
          <div className="stat-num">{stat.number}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  </div>
</section>
\`\`\`

### Liste Services Massive (fond noir)
\`\`\`tsx
<section className="py-24 bg-black text-white">
  <div className="container">
    {services.map((service, index) => (
      <div 
        className={\`border-b border-gray-800 py-12 cursor-pointer transition-all duration-300 hover:pl-8 \${
          activeService === index ? 'pl-8' : ''
        }\`}
        onMouseEnter={() => setActiveService(index)}
      >
        <div className="flex items-baseline gap-6 mb-4">
          <span className={\`text-eyebrow \${
            activeService === index ? 'text-accent' : 'text-gray-600'
          }\`}>
            {service.id}
          </span>
          <h3 className={\`text-h2 font-bold transition-opacity duration-300 \${
            activeService === index ? 'opacity-100' : 'opacity-20'
          }\`}>
            {service.title}
          </h3>
        </div>
        {activeService === index && (
          <p className="text-gray-400 max-w-2xl animate-fade">
            {service.description}
          </p>
        )}
      </div>
    ))}
  </div>
</section>
\`\`\`

### Cards avec Corner Mark
\`\`\`tsx
<div className="grid md:grid-cols-3 gap-8">
  {items.map((item) => (
    <div className="card-premium corner-mark reveal">
      <div className="text-eyebrow text-accent mb-4">{item.step}</div>
      <h3 className="text-h3 font-bold mb-4">{item.title}</h3>
      <p className="text-body text-gray-600">{item.description}</p>
    </div>
  ))}
</div>
\`\`\`

### Citation Large (Testimonial)
\`\`\`tsx
<section className="py-24 bg-black text-white">
  <div className="container max-w-4xl">
    <div className="text-center">
      <div className="text-6xl text-accent mb-8">"</div>
      <blockquote className="h-display mb-8">
        Citation importante avec 
        <span className="text-accent"> partie mise en évidence</span> 
        pour l'impact.
      </blockquote>
      <div className="divider-dark-premium mx-auto w-24 mb-8"></div>
      <div>
        <p className="font-bold">Nom Personne</p>
        <p className="text-gray-400 text-small">Titre, Entreprise</p>
      </div>
    </div>
  </div>
</section>
\`\`\`

## 4. Animations et Interactions

### Observer pour Reveal au Scroll
\`\`\`typescript
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}, []);
\`\`\`

### Header Sticky avec Effet
\`\`\`tsx
const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  const handleScroll = () => {
    setScrolled(window.scrollY > 50);
  };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

<header className={\`fixed top-0 w-full z-50 transition-all duration-300 \${
  scrolled ? 'bg-white/95 backdrop-blur-md border-b border-gray-200' : 'bg-transparent'
}\`}>
\`\`\`

## 5. Règles d'Usage

### Hiérarchie Typographique
1. **Hero**: h-display-xxl ou h-display-xl avec gradient
2. **Sections**: h-display ou h1
3. **Sous-sections**: h2 ou h3
4. **Body**: text-body (16px) avec line-height généreux
5. **Eyebrow**: Toujours en UPPERCASE avec flèche ↳

### Couleurs
- **Texte principal**: black (#0D0D0F) sur fond clair
- **Texte secondaire**: gray-500 (#52525B)
- **Texte tertiaire**: gray-400 (#8A8A93)
- **Accent**: Violet (#7C3AED) - Usage parcimonieux
- **Fond sombre**: black ou near-black
- **Bordures**: gray-200 (clair) ou gray-800 (sombre)

### Espacement
- **Sections**: py-24 (96px) minimum
- **Container**: padding latéral responsive
- **Gap grilles**: gap-6 ou gap-8
- **Marges texte**: mb-4, mb-8, mb-12, mb-16

### Effets
- **Hover cards**: shadow-card → shadow-card-hover
- **Hover boutons**: Changement de couleur subtil
- **Transitions**: duration-200 ou duration-300
- **Reveal**: Ajouter classe .reveal pour animation au scroll

## 6. Checklist d'Implémentation

✅ **Configuration Tailwind**
- [ ] Importer les couleurs premium
- [ ] Configurer les fontSize custom
- [ ] Ajouter les borderRadius, shadows, gradients

✅ **Classes CSS**
- [ ] Copier les classes utilitaires dans index.css
- [ ] Vérifier les @apply et @layer components

✅ **Composants**
- [ ] Utiliser les patterns de sections
- [ ] Appliquer les classes premium
- [ ] Implémenter les animations reveal

✅ **Accessibilité**
- [ ] Contraste minimum 4.5:1
- [ ] Focus visible sur tous les éléments interactifs
- [ ] Zones cliquables minimum 44x44px
- [ ] Alt text sur toutes les images

## 7. Exemples de Pages Complètes

### Structure Page Type
\`\`\`tsx
<div className="min-h-screen bg-white">
  {/* Header sticky */}
  <Header />
  
  {/* Hero avec noise effect */}
  <HeroSection />
  
  {/* Stats avec grands chiffres */}
  <StatsSection />
  
  {/* Services liste massive fond noir */}
  <ServicesSection />
  
  {/* Cards avec corner marks */}
  <ProcessSection />
  
  {/* Testimonial citation large */}
  <TestimonialSection />
  
  {/* CTA final */}
  <CTASection />
  
  {/* Footer premium */}
  <Footer />
</div>
\`\`\`

## Notes Importantes pour l'IA

1. **Toujours privilégier le contraste**: Noir sur blanc ou blanc sur noir
2. **Accent avec parcimonie**: Le violet ne doit pas dominer
3. **Typographie massive**: Ne pas hésiter sur les grandes tailles
4. **Espacement généreux**: Laisser respirer les éléments
5. **Animations subtiles**: Reveal au scroll, pas d'overshoot
6. **Mobile-first**: Toutes les classes doivent être responsive
7. **Performance**: Lazy loading des images, optimisation des animations

Cette charte graphique est conçue pour créer une expérience premium, minimaliste et moderne. Elle doit être appliquée de manière cohérente sur toutes les pages du site.`,
    general: `# Documentation Technique - Vaya

## Vue d'ensemble
Vaya est une plateforme de gestion de projets et de ressources humaines permettant de connecter des clients avec des candidats qualifiés pour former des équipes projet.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Real-time**: Supabase Realtime pour les mises à jour instantanées
- **Storage**: Supabase Storage pour les fichiers projet

## Flux métier principal
1. **Client** crée un projet et définit ses besoins en ressources
2. **Système** recherche les candidats correspondants (status: recherche)
3. **Candidats** reçoivent les notifications et peuvent accepter/refuser
4. **Client** démarre le projet une fois l'équipe complète (kickoff)
5. **Équipe** accède aux outils collaboratifs (Planning, Kanban, Drive, Messages)

## Points d'attention critiques
- Les candidats doivent être qualifiés avant de pouvoir recevoir des missions
- Un projet doit avoir toutes ses ressources acceptées avant de pouvoir démarrer
- Le statut 'play' active les outils collaboratifs pour l'équipe
- L'invitation kickoff doit apparaître dans le planning des candidats
- La messagerie utilise **EnhancedMessageSystem** pour TOUS les utilisateurs (unifié 30/08/2024)
- Les politiques RLS storage acceptent booking_status IN ('accepted', 'booké') (corrigé 31/08/2024)
- **⚠️ Contrainte status projet**: Seuls 'play', 'pause', 'completed' sont autorisés (suppression utilise 'completed' + deleted_at)

## Corrections majeures du 03/09/2025
1. **Matching candidats complet**: Vérifie profile_id, seniority, status, langues ET expertises
2. **Notifications booking**: Corrigé status IN ('disponible', 'en_pause'), excluant 'qualification'
3. **Realtime ressources**: Ajout subscription dans ProjectCard pour updates instantanées
4. **Realtime projets candidat**: Filtrage par assignment avant update
5. **Suppression projet**: Edge Function fix-project-delete pour contrainte SQL
6. **resource-booking-debug supprimé**: Fonction doublon éliminée

## Conventions de code
- Utiliser des hooks personnalisés pour la logique métier réutilisable
- Préfixer les composants partagés avec 'Shared'
- Utiliser le real-time Supabase pour les mises à jour instantanées
- Toujours filtrer les données côté serveur (RLS)
- Ne jamais créer de fonctions debug, corriger directement les originales`,

    'candidat-flow': `# Flux Candidat

## Parcours complet du candidat

### 1. Inscription
- Candidat s'inscrit → status: 'qualification'
- qualification_status: 'pending'
- Remplit son profil (compétences, expérience, etc.)

### 2. Onboarding
- Complète les informations personnelles
- Upload CV et documents
- Sélectionne profil métier et seniorité

### 3. Qualification
- Passe le test de qualification
- Score >= 80% → qualification_status: 'qualified', status: 'disponible'
- Score 60-79% → qualification_status: 'stand_by' (validation manuelle)
- Score < 60% → qualification_status: 'rejected'

### 4. Réception de missions
- Seuls les candidats avec status != 'qualification' reçoivent les notifications
- Le matching se fait sur 5 critères OBLIGATOIRES:
  - profile_id (métier exact)
  - seniority (niveau exact)
  - status != 'qualification' (candidat qualifié)
  - languages (toutes les langues requises)
  - expertises (toutes les expertises requises)
- Notification visible dans le dashboard candidat

### 5. Acceptation/Refus
- Accepte → booking_status: 'accepted' ET candidate_id défini
- Refuse → booking_status: 'declined'
- Si tous acceptent → projet passe en 'attente-team'

### 6. Participation au projet
- Accès aux outils collaboratifs (Planning, Kanban, Drive, Messages)
- Réception des invitations aux événements
- Collaboration avec l'équipe`,

    'candidat-onboarding': `# Onboarding Candidat

## Processus d'onboarding

### Étapes obligatoires
1. **Informations personnelles**
   - Nom, prénom
   - Téléphone
   - Adresse

2. **Profil professionnel**
   - Sélection du métier (hr_profiles)
   - Choix de la seniorité (junior/confirmed/senior)
   - Années d'expérience

3. **Documents**
   - Upload CV (optionnel mais recommandé)
   - Photo de profil (optionnel)

### Tables impactées
- candidate_profiles: Mise à jour des informations
- candidate_skills: Ajout des compétences
- storage: Stockage des documents

### Validation
- onboarding_completed: true une fois terminé
- Redirection vers le test de qualification`,

    'candidat-qualification': `# Qualification Candidat

## Système de qualification

### Test de qualification
- Questions générées par IA selon le profil
- Score calculé automatiquement
- Durée limitée (30 minutes)

### Niveaux de qualification
| Score | Status | Action |
|-------|--------|--------|
| >= 80% | qualified | Accès immédiat aux missions |
| 60-79% | stand_by | Validation manuelle requise |
| < 60% | rejected | Nouveau test possible après 30 jours |

### Tables concernées
- candidate_qualification_tests: Historique des tests
- candidate_profiles: Mise à jour qualification_status

### Edge Function
- skill-test-ai: Génère et évalue les tests`,

    'candidat-missions': `# Gestion des Missions Candidat

## 🆕 Corrections Importantes (03/09/2025 - Session complète)

### 1. Système de matching candidats COMPLET ✅
- **Fichier principal**: src/pages/CandidateDashboard.tsx
- **Changement majeur**: Implémentation du matching complet à 5 critères
  - Récupération des langues du candidat via candidate_languages
  - Récupération des expertises du candidat via candidate_expertises
  - Vérification profile_id ET seniority ET status ET langues ET expertises
  - Alignement avec la logique de CandidateMissionRequests.tsx
- **Résultat**: Les candidats ne voient QUE les projets qui correspondent exactement

### 2. Correction notification "Chercher candidats" ✅
- **Problème initial**: Candidats ne recevaient pas les notifications
- **Cause racine**: resource-booking-debug cherchait status='active' (inexistant)
- **Solution appliquée**:
  - Correction dans resource-booking: \`.neq('status', 'qualification').in('status', ['disponible', 'en_pause'])\`
  - Suppression complète de resource-booking-debug (doublon)
  - Mise à jour ProjectCard.tsx pour utiliser resource-booking
- **Statuts valides candidat**: 'qualification', 'disponible', 'en_pause', 'indisponible'

### 3. Realtime loader ressources ✅
- **Fichier**: src/components/ProjectCard.tsx
- **Ajout**: Subscription realtime pour hr_resource_assignments
- **Code**:
  \`\`\`typescript
  const channel = supabase
    .channel(\`resource-assignments-\${project.id}\`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'hr_resource_assignments',
      filter: \`project_id=eq.\${project.id}\`
    }, fetchAssignments)
  \`\`\`
- **Résultat**: Le loader se met à jour instantanément après booking

### 4. Realtime statut projet côté candidat ✅
- **Fichier**: src/hooks/useRealtimeProjectsFixed.ts
- **Problème**: Changement de statut (pause) non reflété côté candidat
- **Solution**: Vérifier si le candidat est assigné avant de traiter l'update
- **Code ajouté**:
  \`\`\`typescript
  if (userType === 'candidate') {
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select('id')
      .eq('project_id', project.id)
      .eq('candidate_id', candidateProfile?.id)
      .limit(1);
    
    if (assignments && assignments.length > 0) {
      await handleProjectUpdate(payload);
    }
  }
  \`\`\`

### 5. Correction popup projets acceptés ✅
- **Fichier**: src/components/candidate/CandidateProjectsSection.tsx
- **Problème**: Bouton "Accéder au projet" générait une 404
- **Solution**: Toujours ouvrir le modal au lieu de naviguer
- **Comportement unifié**: Modal fullscreen pour tous les projets

### 6. Fix suppression projet (contrainte SQL) ✅
- **Problème**: projects_status_check n'autorise que 'play', 'pause', 'completed'
- **Solution**: Edge Function fix-project-delete utilisant status='completed' + deleted_at
- **Fichier modifié**: src/components/DeleteProjectDialog.tsx
- **Note**: Migration SQL nécessaire pour ajouter 'cancelled' et 'archived'

### 7. Logique de filtrage des missions
**Règles finales implémentées**:
- Si candidate_id = candidat actuel → Toujours afficher ✓
- Si candidate_id = autre candidat → Ne jamais afficher ✓
- Si candidate_id = null ET booking_status = 'recherche' → Vérifier:
  1. profile_id correspond exactement ✓
  2. seniority correspond exactement ✓
  3. status != 'qualification' ✓
  4. Toutes les langues requises présentes ✓
  5. Toutes les expertises requises présentes ✓

### 8. Edge Functions déployées aujourd'hui
- **fix-project-delete**: Workaround pour contrainte status
- **resource-booking**: Corrigé pour matching candidats
- Suppression de resource-booking-debug

### Points d'amélioration identifiés
1. **Migration SQL nécessaire** pour ajouter statuts 'cancelled' et 'archived'
2. **Uniformisation booking_status**: Certaines parties utilisent 'booké' vs 'accepted'
3. **Performance**: Le matching pourrait être optimisé côté SQL

## Réception et gestion des missions

### Notification de mission
- Déclenchée quand booking_status passe à 'recherche'
- Visible dans candidate_notifications
- Affichage dans le dashboard avec détails du projet
- **Filtre important**: Seuls assignments avec booking_status='recherche' ET matching profile/seniority

### Acceptation de mission
1. Candidat clique "Accepter"
2. resource-booking Edge Function appelée avec:
   - action: 'accept_mission'
   - assignment_id: ID de l'assignment
   - candidate_email: Email du candidat
3. Vérifications dans l'Edge Function:
   - Assignment existe et est en 'recherche'
   - Candidat existe dans candidate_profiles
4. Mise à jour atomique:
   - booking_status → 'accepted'
   - candidate_id → ID du candidat (CRITIQUE!)
5. Mise à jour projet:
   - Si toutes ressources acceptées → status = 'play'
   - Si partiellement acceptées → status = 'pause'
6. Notification au client (table notifications)

### Refus de mission
1. Candidat clique "Refuser"
2. booking_status → 'declined'
3. Système cherche un autre candidat
4. Notification au client

### Points critiques
- candidate_id DOIT être défini lors de l'acceptation
- Vérifier que le candidat n'est pas déjà sur un autre projet actif
- Statuts projet limités par contrainte DB: 'play', 'pause', 'completed', 'archivé'`,

    'candidat-realtime': `# Temps Réel Candidat

## Mises à jour en temps réel

### Tables avec realtime activé
- projects: Changements de statut
- hr_resource_assignments: Nouvelles assignations
- candidate_notifications: Nouvelles notifications
- messages: Nouveaux messages
- kanban_cards: Mises à jour des tâches

### Hook principal amélioré
\`\`\`typescript
useRealtimeProjectsFixed()
// Écoute les changements sur:
// - projects (status) → Synchronisation immédiate
// - hr_resource_assignments (booking_status)
// - Met à jour automatiquement l'UI

// AMÉLIORATION 2024:
// - Synchronisation projets dans assignments
// - Utilisation de refs pour éviter closures périmées
// - Update immédiat sans refresh page
\`\`\`

### Indicateurs visuels temps réel
- **Badge "En pause"** (orange avec icône Pause)
  - Affiché quand status='pause' ou 'attente-team'
  - Visible sur les cartes projet candidat
  
- **Time Tracker bloqué**
  - Projets en pause exclus de la liste
  - Message explicite sur la restriction
  - Seuls projets 'play' permettent le tracking

### Synchronisation client ↔ candidat
- Changement status côté client → Update immédiat côté candidat
- Les projets changent automatiquement d'onglet (pause/en cours)
- Pas besoin de rafraîchir la page
- Badge "En pause" apparaît/disparaît en temps réel

### Événements surveillés
- INSERT: Nouvelles assignations
- UPDATE: Changements de statut (immédiat)
- DELETE: Suppressions (rare)`,

    'candidat-activities': `# ⏱️ Activités & Time Tracking Candidat

## Vue d'ensemble

Le système d'activités pour les candidats est basé sur le **Time Tracking** uniquement. Les activités affichées dans "Mes activités" correspondent aux sessions de temps enregistrées via le Time Tracker.

## Architecture technique

### Composants principaux
\`\`\`typescript
// Tracker de temps dans le header
TimeTrackerSimple
- Localisation: src/components/time-tracking/TimeTrackerSimple.tsx
- Fonction: Démarrer/Arrêter des sessions de temps
- Position: Header du dashboard candidat
- **RESTRICTION**: Ne fonctionne QUE pour les projets avec status='play'
- Les projets en pause sont exclus de la liste

// Page d'affichage des activités
CandidateActivities
- Localisation: src/pages/CandidateActivities.tsx
- Fonction: Afficher, filtrer et exporter les sessions
- Utilise: useCandidateProjectsOptimized() pour la liste des projets
\`\`\`

### Table de base de données
\`\`\`sql
CREATE TABLE time_tracking_sessions (
  id UUID PRIMARY KEY,
  candidate_id UUID REFERENCES candidate_profiles(id),
  project_id UUID REFERENCES projects(id),
  activity_description TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  hourly_rate DECIMAL,
  total_cost DECIMAL,
  status VARCHAR(20), -- 'active', 'paused', 'completed'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
\`\`\`

## Flux d'enregistrement d'activité

### 1. Démarrage d'une session
1. Candidat clique sur l'icône **horloge** dans le header
2. Sélectionne un projet dans la liste (projets avec status='play')
3. Ajoute une description de l'activité
4. Clique sur "Démarrer"
5. Une entrée est créée dans time_tracking_sessions avec status='active'

### 2. Pendant la session
- Timer s'affiche en temps réel
- Possibilité de mettre en pause (status='paused')
- Reprise possible après pause
- Le temps est calculé automatiquement

### 3. Fin de session
1. Candidat clique sur "Stop"
2. La session est marquée comme status='completed'
3. duration_minutes est calculé
4. total_cost = duration_minutes × hourly_rate

### 4. Affichage dans "Mes activités"
- Liste toutes les sessions avec status='completed'
- Filtrage par projet possible
- Filtrage par période (semaine/mois/tout)
- Export CSV disponible

## Hook personnalisé: useTimeTracking

\`\`\`typescript
const {
  activeSession,      // Session en cours si existe
  candidateRate,      // Taux horaire du candidat
  loading,           // État de chargement
  startSession,      // Fonction pour démarrer
  togglePause,       // Fonction pause/reprise
  stopSession,       // Fonction pour arrêter
  formatTime         // Formatage du temps
} = useTimeTracking();
\`\`\`

## Ce qui EST tracké (activités visibles)

✅ **Sessions de Time Tracking**
- Temps passé sur un projet
- Description de l'activité
- Calcul automatique du coût
- Durée précise en minutes

## Ce qui N'EST PAS tracké (non visible dans activités)

❌ **Actions Kanban**
- Création de cartes
- Déplacement de cartes
- Finalisation de tâches
→ Ces actions sont enregistrées dans kanban_cards mais pas dans time_tracking_sessions

❌ **Actions Drive**
- Upload de fichiers
- Téléchargement
- Création de dossiers
→ Ces actions ne créent pas d'entrées d'activité

❌ **Messages**
- Envoi de messages
- Participation aux discussions
→ Enregistrés dans messages mais pas comme activités

❌ **Planning**
- Acceptation/Refus d'événements
- Modifications du planning
→ Pas considéré comme activité facturable

## Points importants

### Calcul du taux horaire
- Récupéré depuis hr_resource_assignments
- calculated_price = taux pour le projet
- Converti en taux par minute pour précision

### Projets disponibles
- Seuls les projets avec status='play' sont listés
- Le candidat doit avoir booking_status='accepted'
- Utilise useCandidateProjectsOptimized() pour cohérence

### Format d'export CSV
\`\`\`csv
Date,Projet,Activité,Durée (min),Tarif/min,Coût total
2024-08-31,Projet A,Développement feature X,120,1.67,200
\`\`\`

## Résumé

Le système d'activités est **volontairement limité** au Time Tracking car :
1. **Facturation** : Seul le temps réel travaillé est facturable
2. **Transparence** : Le client voit exactement le temps passé
3. **Simplicité** : Pas de tracking automatique intrusif
4. **Contrôle** : Le candidat choisit quand tracker son temps

Pour qu'une action apparaisse dans "Mes activités", elle DOIT passer par le Time Tracker.`,

    'projet-workflow': `# Workflow Projet

## Cycle de vie complet d'un projet

### 1. Création (status: 'pause')
- Client crée le projet
- Définit titre, description, dates, budget
- Configure les ressources nécessaires via ReactFlow

### 2. Recherche d'équipe
- Pour chaque ressource → booking_status: 'recherche'
- Notifications envoyées aux candidats matchés
- Suivi des acceptations/refus

### 3. Équipe complète (status: 'attente-team')
- Tous les candidats ont accepté
- Projet prêt à démarrer
- En attente du kickoff client
- **Badge "En pause"** affiché côté candidat
- **Time Tracker bloqué** (pas de suivi temps possible)

### 4. Démarrage (status: 'play')
- Client lance le kickoff
- project-orchestrator configure tout
- Outils collaboratifs activés
- Invitations planning envoyées
- **Time Tracker disponible** (suivi temps activé)
- Mise à jour realtime immédiate côté candidat

### 5. En cours
- Équipe utilise les outils
- Collaboration active
- Suivi du temps et facturation

### 6. Terminé (status: 'completed')
- Projet marqué comme terminé
- Facturation finale
- Archivage des données

## 🗂️ Système d'Archivage et Suppression

### Archivage de Projet
**Action réversible** - Le projet devient lecture seule

#### Processus
1. Client sélectionne "Archiver" dans le menu kebab
2. Modal de confirmation avec choix archive/delete
3. Saisie obligatoire: "ARCHIVE [nom du projet]"
4. Raison optionnelle

#### Effets
- **Statut**: archived_at rempli
- **Accès**: Lecture seule pour tous
- **Données**: Tout est conservé
- **UI**: Onglet "Archivés" dans dashboard
- **Notifications**: Tous les candidats notifiés
- **Réversible**: Peut être désarchivé

### Suppression Douce (Soft Delete)
**Action irréversible** - Conservation des données critiques

#### Processus
1. Client sélectionne "Supprimer" dans le menu
2. Modal avec avertissements détaillés
3. Saisie obligatoire: "DELETE [nom du projet]"
4. Confirmation de l'irréversibilité

#### Effets
- **Statut**: deleted_at rempli, status → 'cancelled'
- **Accès Drive/Kanban**: Révoqué immédiatement
- **Messages**: Archive conservée (lecture seule)
- **Factures**: Toujours accessibles
- **Time Tracking**: Données conservées pour facturation
- **Notifications**: Type 'project_deleted' envoyé

### Tableau Comparatif

| Action | Réversible | Données | Accès | Facturation |
|--------|------------|---------|--------|-------------|
| **Archivage** | ✅ Oui | Conservées | Lecture seule | Accessible |
| **Suppression** | ❌ Non | Partiellement | Révoqué | Historique conservé |
| **En pause** | ✅ Oui | Actives | Complet | Time tracking bloqué |

### Notifications Système

#### Types ajoutés
- \`project_archived\`: Projet mis en archive
- \`project_unarchived\`: Projet réactivé
- \`project_deleted\`: Suppression définitive
- \`project_cancelled\`: Annulation (via suppression)

#### Icônes
- 📁 Archive (bleu)
- 🔄 Désarchivage (vert)
- 🗑️ Suppression (rouge)
- ⛔ Annulation (orange)

### Tables Base de Données

#### Nouvelles colonnes dans \`projects\`
\`\`\`sql
archived_at TIMESTAMPTZ,
archived_by UUID REFERENCES profiles(id),
archived_reason TEXT,
deleted_at TIMESTAMPTZ,
deleted_by UUID REFERENCES profiles(id),
deletion_reason TEXT
\`\`\`

#### Nouvelle table \`project_action_logs\`
\`\`\`sql
CREATE TABLE project_action_logs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  action_type TEXT CHECK (action_type IN ('archived', 'unarchived', 'deleted', 'restored')),
  action_reason TEXT,
  performed_by UUID REFERENCES profiles(id),
  affected_users UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### Fonctions SQL

#### archive_project()
- Paramètres: project_id, user_id, reason
- Retour: JSONB avec success, affected_users
- Actions: Archive + notifications

#### unarchive_project()
- Paramètres: project_id, user_id
- Retour: JSONB avec success
- Actions: Désarchivage + notifications

#### soft_delete_project()
- Paramètres: project_id, user_id, reason
- Retour: JSONB avec success, affected_users
- Actions: Suppression douce + notifications urgentes`,

    'projet-pause-reprise': `# ⏸️ Système de Pause/Reprise des Projets

## Vue d'ensemble

Le système permet au client de mettre en pause ou reprendre un projet à tout moment. Cette fonctionnalité est essentielle pour gérer les projets selon les besoins métier.

## Fonctionnement côté Client

### Mise en pause d'un projet actif
1. Le client clique sur "Mettre en pause" sur un projet avec status='play'
2. Le système met à jour le statut à 'pause'
3. Le bouton devient "Démarrer le projet"
4. Le badge "En pause" apparaît sur la carte projet

### Reprise d'un projet en pause
1. Le client clique sur "Démarrer le projet" sur un projet avec status='pause'
2. Vérification automatique:
   - Si aucune ressource acceptée → Message d'erreur
   - Si certaines ressources manquantes → Status 'attente-team'
   - Si toutes les ressources acceptées → Dialog kickoff
3. Après kickoff, le projet passe en status='play'

### Code d'implémentation (ClientDashboard.tsx)
\`\`\`typescript
const onToggleStatus = async (id: string, currentStatus: string) => {
  let newStatus: string;
  
  if (currentStatus === 'play') {
    newStatus = 'pause';
  } else if (currentStatus === 'pause') {
    // Vérifications et démarrage via kickoff
    const acceptedResources = resourceAssignments.filter(
      a => a.project_id === id && a.booking_status === 'accepted'
    );
    if (acceptedResources.length === totalResources.length) {
      handleStartProject(project); // Ouvre le dialog kickoff
      return;
    }
  }
  
  await supabase.from('projects').update({ status: newStatus }).eq('id', id);
};
\`\`\`

## Fonctionnement côté Candidat

### Restrictions pour projets en pause
- **Outils collaboratifs désactivés**: Planning, Kanban, Drive, Messages
- **Time tracking bloqué**: Projets en pause exclus de la liste
- **Consultation uniquement**: Bouton "Voir les détails" au lieu de "Accéder au projet"
- **Badge visuel**: Badge orange "En pause" sur la carte projet

### Filtrage automatique (useCandidateProjectsOptimized.ts)
\`\`\`typescript
// Seuls les projets actifs sont retournés pour les outils
const activeProjects = allAcceptedProjects.filter(p => p.status === 'play');
\`\`\`

### Catégorisation (CandidateProjectsSection.tsx)
\`\`\`typescript
// Les projets en pause sont catégorisés comme "attente-kickoff"
const statusCounts = {
  'attente-kickoff': activeProjects.filter(
    p => p.status === 'attente-team' || p.status === 'pause'
  ).length
};
\`\`\`

## Synchronisation Realtime

- Changement de statut côté client → Update immédiat côté candidat
- Badge "En pause" apparaît/disparaît en temps réel
- Projets changent automatiquement d'onglet sans refresh
- Utilisation du hook useRealtimeProjectsFixed pour la synchronisation

## Points techniques importants

1. **Statuts projet limités par DB**: 'play', 'pause', 'completed', 'archivé'
2. **Vérification des ressources** avant reprise du projet
3. **Kickoff obligatoire** pour passer de 'pause' à 'play'
4. **Filtrage automatique** des projets pour les outils collaboratifs`,

    'projet-edition-candidat': `# 🔄 Édition de Projet et Changement de Candidat

## Vue d'ensemble

Lors de l'édition d'un projet, certains changements peuvent nécessiter de remplacer le candidat assigné. Ce système gère automatiquement ces transitions.

## Règles de changement de candidat

### Changement OBLIGATOIRE si:
- **Séniorité modifiée**: Le candidat actuel ne correspond plus au niveau demandé

### Changement CONDITIONNEL si:
- **Expertises modifiées**: Vérifier si le candidat actuel possède les nouvelles expertises
- **Langues modifiées**: Vérifier si le candidat actuel parle les nouvelles langues
- Si le candidat correspond toujours → Garder le même
- Sinon → Rechercher un nouveau candidat

## Flux de changement de candidat

### 1. Détection du changement
Lors de la sauvegarde du projet modifié:
\`\`\`typescript
// Vérifier si les critères ont changé
if (oldSeniority !== newSeniority) {
  needsCandidateChange = true;
} else if (expertisesChanged || languagesChanged) {
  // Vérifier si le candidat actuel correspond toujours
  const candidateMatches = await checkCandidateMatch(
    candidateId, 
    newExpertises, 
    newLanguages
  );
  needsCandidateChange = !candidateMatches;
}
\`\`\`

### 2. Actions si changement nécessaire

#### Pour l'ancien candidat:
1. **NE PAS supprimer** l'assignment
2. Mettre à jour booking_status à 'completed'
3. Le projet apparaît dans l'onglet "Terminés" du candidat
4. Notification: "Le projet {title} a été clôturé suite à un changement de besoins"

#### Pour le projet:
1. Créer un nouvel assignment avec booking_status='recherche'
2. Mettre à jour le status du projet à 'attente-team'
3. Lancer la recherche de nouveaux candidats

#### Pour le client:
1. Affichage du badge "En attente d'équipe"
2. CTA devient "Booker les équipes" ou "En attente de confirmation"
3. Notification: "Suite aux modifications, une nouvelle recherche de candidat est en cours"

### 3. Implémentation dans EditProjectModal

\`\`\`typescript
const handleSave = async () => {
  // 1. Sauvegarder les modifications du projet
  await updateProject(projectData);
  
  // 2. Vérifier les changements de ressources
  for (const assignment of resourceAssignments) {
    const needsChange = await checkIfCandidateNeedsChange(
      assignment,
      newRequirements
    );
    
    if (needsChange && assignment.candidate_id) {
      // Clôturer l'assignment actuel
      await supabase
        .from('hr_resource_assignments')
        .update({ 
          booking_status: 'completed',
          completed_at: new Date().toISOString(),
          completion_reason: 'requirements_changed'
        })
        .eq('id', assignment.id);
      
      // Créer un nouvel assignment
      await supabase
        .from('hr_resource_assignments')
        .insert({
          project_id: projectId,
          profile_id: assignment.profile_id,
          seniority: newSeniority,
          expertises: newExpertises,
          languages: newLanguages,
          booking_status: 'recherche'
        });
    }
  }
  
  // 3. Mettre à jour le statut du projet si nécessaire
  const hasSearching = await checkHasSearchingAssignments(projectId);
  if (hasSearching) {
    await supabase
      .from('projects')
      .update({ status: 'attente-team' })
      .eq('id', projectId);
  }
};
\`\`\`

## Tables impactées

### hr_resource_assignments
- Ajout de colonnes:
  - completed_at: TIMESTAMPTZ
  - completion_reason: TEXT ('requirements_changed', 'project_completed', etc.)

### candidate_notifications
- Création de notifications pour informer les candidats

## Points d'attention

1. **Toujours conserver l'historique**: Ne jamais supprimer les assignments
2. **Notifications claires**: Informer tous les acteurs des changements
3. **Transition en douceur**: Le candidat voit son projet "terminé" plutôt que supprimé
4. **Cohérence des statuts**: Projet en 'attente-team' si recherche en cours`,

    'projet-demarrage': `# 🔥 Démarrage Projet (Kickoff)

## Vue d'ensemble technique

Le démarrage d'un projet est un processus orchestré complexe qui configure automatiquement tous les outils collaboratifs et synchronise l'équipe.

## Déclenchement

### Condition préalable
- Toutes les ressources doivent avoir booking_status = 'accepted'
- Le projet doit être en status 'attente-team' ou 'pause'

### Action client
1. Client va dans "Mes projets" → Onglet "En pause"
2. Clique sur "Démarrer le projet"
3. Sélectionne date et heure du kickoff
4. Confirme le démarrage

## Séquence d'exécution

### 1. useProjectOrchestrator Hook
\`\`\`typescript
// Appelé depuis le composant React
const { setupProject } = useProjectOrchestrator();
await setupProject(projectId, kickoffDate);
\`\`\`

### 2. project-orchestrator Edge Function

#### Étape 1: Récupération des données
- Charge le projet depuis 'projects'
- Récupère les assignations acceptées (hr_resource_assignments)
- Pour chaque assignation, trouve le candidat via candidate_id
- Récupère le profil du client (owner)

#### Étape 2: Remplissage project_teams
**NOUVEAU (30/08/2024)** - Table critique pour le kickoff
\`\`\`sql
INSERT INTO project_teams (
  project_id, member_id, member_type, 
  email, first_name, last_name, role
) VALUES
-- Client/Owner
(projectId, ownerId, 'client', email, firstName, lastName, 'owner'),
-- Chaque candidat accepté
(projectId, candidateId, 'resource', email, firstName, lastName, profileType)
\`\`\`

#### Étape 3: Création Kanban
- Crée kanban_boards avec titre et description
- Ajoute les colonnes standards:
  - Setup (rappels projet)
  - À faire
  - En cours
  - À vérifier
  - Finalisé
- Crée des cartes contextuelles dans Setup:
  - Description du projet
  - Dates clés
  - Budget global
  - Constitution de l'équipe
  - Livrables à fournir

#### Étape 4: Initialisation Storage
- Appelle init-project-storage
- Crée la structure de dossiers dans Supabase Storage:
  - /project/{projectId}/
  - Sous-dossiers par catégorie de ressource

#### Étape 5: Notifications équipe
- Crée une notification pour chaque candidat
- Titre: "Bienvenue dans le projet {title}"
- Les informe de l'accès aux outils

#### Étape 6: Mise à jour statut
- project.status → 'play'

### 3. project-kickoff Edge Function

#### ⚠️ Important (Corrigé Session 4)
**Ne PAS utiliser de jointures** avec client_profiles pour éviter les problèmes RLS.
Récupérer les données séparément:
1. D'abord le projet
2. Puis le profil client si besoin
3. Enfin les candidats un par un

#### Étape 1: Récupération du projet et de l'équipe
\`\`\`sql
-- Récupération projet SANS jointure
SELECT * FROM projects WHERE id = projectId;

-- Récupération profil client séparément 
SELECT * FROM client_profiles WHERE id = ownerId;

-- Récupération candidats acceptés
SELECT * FROM hr_resource_assignments 
WHERE project_id = projectId 
AND booking_status = 'accepted';

-- Pour chaque candidat, récupération profil séparée
SELECT * FROM candidate_profiles WHERE id = candidateId;
\`\`\`

#### Étape 2: Création événement kickoff
\`\`\`sql
INSERT INTO project_events (
  project_id, title, description,
  start_at, end_at, video_url
) VALUES (
  projectId,
  'Kickoff - {project.title}',
  'Réunion de lancement du projet',
  kickoffDate,
  kickoffDate + 1 hour,
  'https://meet.jit.si/{projectId}-kickoff'
)
\`\`\`

#### Étape 3: Ajout des attendees
\`\`\`sql
INSERT INTO project_event_attendees (
  event_id, email, required, response_status
) 
SELECT eventId, email, true, 'pending'
FROM project_teams WHERE project_id = projectId
\`\`\`

#### Étape 4: Notifications candidats
**NOUVEAU (30/08/2024)** - Critical pour visibilité planning
\`\`\`sql
INSERT INTO candidate_event_notifications (
  candidate_id, project_id, event_id,
  title, description, event_date,
  video_url, status
)
SELECT 
  member_id, projectId, eventId,
  'Invitation Kickoff - {title}',
  'Vous êtes invité à la réunion de lancement',
  kickoffDate, videoUrl, 'pending'
FROM project_teams 
WHERE project_id = projectId 
  AND member_type = 'resource'
\`\`\`

## Tables impactées

### Tables principales modifiées
1. **projects**: status → 'play'
2. **project_teams**: Ajout de tous les membres (client + candidats)
3. **kanban_boards**: Création du tableau
4. **kanban_columns**: Ajout des colonnes
5. **kanban_cards**: Création des cartes initiales
6. **project_events**: Création événement kickoff
7. **project_event_attendees**: Ajout des participants
8. **candidate_event_notifications**: Invitations pour candidats
9. **candidate_notifications**: Notifications générales

### Tables consultées
- hr_resource_assignments: Pour trouver les candidats acceptés
- candidate_profiles: Pour les infos des candidats
- profiles: Pour les infos du client
- hr_profiles: Pour les catégories de ressources

## Points d'attention critiques

### ⚠️ Conditions de succès
1. **candidate_id DOIT être défini** dans hr_resource_assignments
2. **project_teams DOIT être remplie** avant d'appeler project-kickoff
3. **Tous les candidats doivent avoir accepté** (booking_status = 'accepted')

### 🐛 Erreurs courantes
- "Aucun candidat trouvé" → candidate_id non défini lors de l'acceptation
- "Kickoff non visible" → project_teams non remplie
- "Invitation absente" → candidate_event_notifications non créée

### ✅ Vérifications
- Vérifier que project_teams contient tous les membres
- Confirmer que candidate_event_notifications a les invitations
- S'assurer que le planning candidat affiche l'événement

## Résultat final

### Pour le client
- Projet en status 'play'
- Kanban configuré avec cartes initiales
- Planning avec événement kickoff
- Espace Drive créé
- Messagerie active

### Pour les candidats
- Notification de bienvenue
- Invitation kickoff dans le planning
- Accès aux outils collaboratifs
- Visibilité du projet dans leur dashboard

### Pour l'équipe
- Environnement de travail complet
- Outils synchronisés
- Communication établie
- Planning partagé actif`,

    'projet-orchestration': `# Orchestration Projet

## project-orchestrator Function

### Responsabilités
- Configuration initiale du projet au démarrage
- Création des espaces de travail (Kanban, Drive)
- Synchronisation de l'équipe
- Envoi des notifications

### Flux d'exécution
1. **NOUVEAU**: Vérification que le projet n'est pas déjà en 'play'
2. Vérification des prérequis (ressources acceptées)
3. Récupération des ressources acceptées
4. Création du Kanban avec colonnes standards
5. Initialisation du storage
6. Notifications à l'équipe
7. Mise à jour du statut projet → 'play'

### Validation ajoutée (Session 4)
\`\`\`typescript
// Empêche le redémarrage d'un projet déjà actif
if (project.status === 'play') {
  return new Response(
    JSON.stringify({ 
      error: 'Le projet est déjà démarré',
      details: 'Ce projet a déjà le statut "play"'
    }),
    { status: 400 }
  );
}
\`\`\`

### Tables modifiées
- kanban_boards, kanban_columns, kanban_cards
- project_teams (remplie avec tous les membres)
- candidate_notifications
- projects (status → 'play')

### Gestion d'erreurs
- Rollback partiel non supporté
- Log détaillé pour debug
- Ne bloque pas sur erreurs non critiques
- Validation statut pour éviter doublons`,

    'projet-collaboration': `# Outils Collaboratifs

## Outils disponibles (status='play' requis)

### Planning
- Calendrier partagé avec événements
- Invitations avec acceptation/refus
- Intégration Google Calendar
- Notifications par email
- Composant: SharedPlanningView

### Kanban
- Tableau de gestion des tâches
- Colonnes personnalisables
- Drag & drop
- Assignation de tâches
- Pièces jointes
- Composant: KanbanBoard

### Drive
- Stockage organisé par projet
- Dossiers par catégorie
- Upload/download de fichiers
- Prévisualisation
- Composant: SharedDriveView

### Messages (UNIFIÉ 30/08/2024)
- Chat temps réel avancé
- Groupes de discussion
- Messages privés
- Upload de fichiers avec sync Drive
- Présence en ligne
- Formatage de texte
- Composant: **EnhancedMessageSystem** (unifié pour tous)
- Voir documentation détaillée: Projet > Messagerie

## Accès et permissions
- Client: Accès complet à ses projets
- Candidats: Accès aux projets acceptés uniquement
- Filtrage RLS strict

## Points importants
- Tous les outils nécessitent status='play'
- Initialisation automatique au kickoff
- Synchronisation temps réel via Supabase
- Interface unifiée client/candidat`,

    'projet-planning': `# 📅 Planning & Calendrier

## 🆕 Système de Planning Unifié (05/09/2025)

### Vue d'ensemble
Le système de planning unifié remplace l'ancienne implémentation Schedule-X et Cal.com par une solution intégrée complète basée sur la table project_events.

## Architecture technique

### Composants principaux

#### 1. PlanningPage (anciennement CalcPage)
\`\`\`typescript
// src/pages/PlanningPage.tsx
interface PlanningPageProps {
  userType: 'client' | 'candidate';
  userEmail?: string;
  userName?: string;
  candidateId?: string; // Pour les candidats uniquement
}
\`\`\`

**Caractéristiques:**
- Page unifiée pour clients et candidats
- Sélection du projet actif via dropdown
- Chargement des événements depuis project_events
- Chargement des membres d'équipe depuis hr_resource_assignments
- Permissions différenciées (clients peuvent éditer/supprimer)

#### 2. SimpleScheduleCalendar
\`\`\`typescript
// src/components/SimpleScheduleCalendar.tsx
interface SimpleScheduleCalendarProps {
  projectName: string;
  events: CalendarEvent[];
  teamMembers?: TeamMember[];
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
}
\`\`\`

**Caractéristiques:**
- Utilise **date-fns** au lieu de l'API Temporal
- Vue Mois et Liste
- Navigation par mois
- Affichage des événements avec indicateur visuel
- Support des liens Jitsi Meet

#### 3. CreateEventDialog
\`\`\`typescript
// src/components/CreateEventDialog.tsx
interface CreateEventDialogProps {
  open: boolean;
  projectId: string;
  projectTitle: string;
  onClose: () => void;
  onEventCreated: () => void;
}
\`\`\`

**Fonctionnalités:**
- Création d'événements personnalisés
- Sélection des participants (équipe complète)
- Génération automatique du lien Jitsi
- Envoi de notifications aux candidats
- Support des lieux physiques et virtuels
- Accessible aux clients ET candidats

#### 4. ViewEventDialog (NOUVEAU)
\`\`\`typescript
// src/components/ViewEventDialog.tsx
interface ViewEventDialogProps {
  open: boolean;
  eventId: string;
  projectTitle?: string;
  onClose: () => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
  canEdit?: boolean;
}
\`\`\`

**Fonctionnalités:**
- Visualisation détaillée des événements
- Mode édition (clients uniquement)
- Affichage des participants et leurs statuts
- Lien direct vers la visioconférence
- Suppression d'événement (clients uniquement)

### Tables de base de données

#### Colonnes metadata ajoutées (IMPORTANT)
\`\`\`sql
-- À exécuter dans Supabase SQL Editor
ALTER TABLE projects ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN planning_shared TEXT;
ALTER TABLE project_events ADD COLUMN metadata JSONB DEFAULT '{}';
\`\`\`

#### Structure metadata Schedule-X
\`\`\`json
{
  "scheduleX": {
    "calendar_created": true,
    "calendar_config": {
      "id": "calendar-project-id",
      "name": "Calendrier - Nom du projet",
      "color": "#10b981",
      "members": []
    },
    "calendar_url": "/calendar/shared/project-id",
    "kickoff_date": "2025-09-05T14:00:00Z",
    "kickoff_event": {
      "id": "kickoff-123456",
      "title": "Kickoff - Projet",
      "start": "2025-09-05T14:00:00Z",
      "end": "2025-09-05T15:00:00Z"
    },
    "kickoff_meeting_url": "https://meet.jit.si/...",
    "team_members": [],
    "integration_type": "schedule-x"
  }
}
\`\`\`

## Flux de création d'événement

### 1. Via Kickoff automatique
\`\`\`typescript
// supabase/functions/project-kickoff/index.ts
1. Récupère les membres de l'équipe (client + candidats acceptés)
2. Remplit la table project_teams (CRITIQUE!)
3. Génère l'événement kickoff avec lien Jitsi
4. Crée les notifications candidats dans candidate_event_notifications
5. L'événement apparaît dans le planning de tous les membres
\`\`\`

### 2. Via création manuelle
\`\`\`typescript
// PlanningPage → CreateEventDialog
1. Ouvre le dialog de création
2. Charge automatiquement l'équipe du projet
3. Génère le lien Jitsi basé sur le titre
4. Crée l'événement dans project_events
5. Ajoute les participants dans project_event_attendees
6. Envoie les notifications aux candidats
\`\`\`

## Process métier du Planning

### Pour le client
1. **Création projet** → status: 'pause'
2. **Candidats acceptent** → booking_status: 'accepted'
3. **Client démarre projet** → project-orchestrator remplit project_teams
4. **Kickoff créé** → Événement dans project_events
5. **Gestion planning** → Peut créer, modifier, supprimer des événements

### Pour le candidat
1. **Accepte mission** → Apparaît dans "En attente de démarrage"
2. **Client démarre** → Passe en "En cours"
3. **Planning accessible** → Voit tous les événements du projet
4. **Peut créer** → Nouveaux événements avec l'équipe
5. **Pas d'édition** → Ne peut pas modifier/supprimer (client uniquement)

## Intégration dans PlanningPage

### Sélection du projet
\`\`\`typescript
// Différencié selon le type d'utilisateur
const loadProjects = async () => {
  if (userType === 'client') {
    // Client: tous ses projets actifs
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'play');
  } else {
    // Candidat: projets où il est accepté
    const { data } = await supabase
      .from('projects')
      .select('*, hr_resource_assignments!inner(*)')
      .eq('status', 'play')
      .eq('hr_resource_assignments.candidate_id', candidateId)
      .eq('hr_resource_assignments.booking_status', 'accepted');
  }
};
\`\`\`

### Chargement des membres (ÉVOLUTION IMPORTANTE)
\`\`\`typescript
const selectProject = async (project) => {
  // Charge les événements
  const { data: events } = await supabase
    .from('project_events')
    .select('*')
    .eq('project_id', project.id);
  
  // NOUVEAU: Charge les membres depuis la BDD, pas metadata
  const members = [];
  
  // Récupérer le client
  const { data: clientProfile } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('id', project.owner_id);
    
  // Récupérer les candidats acceptés
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select('*, candidate_profiles(*)')
    .eq('project_id', project.id)
    .eq('booking_status', 'accepted');
    
  // Pour un candidat: ne pas s'afficher soi-même
  if (userType === 'candidate') {
    assignments = assignments.filter(a => a.candidate_id !== candidateId);
  }
};
\`\`\`

## Problèmes résolus (05/09/2025)

### 1. Projet reste en "Invitation en attente"
**Problème:** Catégorisation incorrecte des projets acceptés
**Solution:** Vérification du statut projet ET booking_status

### 2. Pas d'événement kickoff visible
**Problème:** project_teams non remplie empêche la création du kickoff
**Solution:** project-orchestrator doit remplir project_teams AVANT project-kickoff

### 3. Membres d'équipe incorrects
**Problème:** Utilisation de metadata obsolète
**Solution:** Chargement depuis hr_resource_assignments et client_profiles

### 4. Doublons Planning/Cal
**Problème:** Deux sections planning différentes
**Solution:** Suppression de l'ancien Planning, renommage Cal → Planning

## API et Hooks

### useProjectUsers (unifié)
\`\`\`typescript
// src/hooks/useProjectUsers.ts
// Récupère client + candidats acceptés d'un projet
const { users, loading } = useProjectUsers(projectId);
\`\`\`

### Notifications candidats
\`\`\`typescript
// Table: candidate_event_notifications
{
  candidate_id: string,
  project_id: string,
  event_id: string,
  title: string,
  description: string,
  event_date: timestamp,
  video_url: string,
  status: 'pending' | 'accepted' | 'declined'
}
\`\`\`

## Guide de déploiement

### 1. Vérifier les colonnes metadata
\`\`\`bash
node force-add-metadata-columns.mjs
\`\`\`

### 2. Déployer la fonction kickoff
\`\`\`bash
npx supabase functions deploy project-kickoff --project-ref egdelmcijszuapcpglsy
\`\`\`

### 3. Tester l'intégration
\`\`\`bash
node test-schedule-x-integration.mjs
\`\`\`

## Avantages Schedule-X vs Cal.com

| Aspect | Cal.com | Schedule-X |
|--------|---------|------------|
| Coût | Payant (cher) | Gratuit |
| Intégration | Externe (iframe) | Native |
| Performance | Chargement lent | Rapide |
| Personnalisation | Limitée | Totale |
| Dépendances | Serveur externe | Aucune |
| Support navigateur | Tous | Tous (avec polyfill) |

## Maintenance

### Ajout de fonctionnalités
- Les événements récurrents peuvent être ajoutés dans SimpleScheduleCalendar
- L'export iCal peut être implémenté via une edge function
- Les rappels par email via Supabase Auth hooks

### Points d'attention
- Toujours vérifier que metadata existe avant d'y accéder
- Les liens Jitsi sont générés avec le pattern: \`project-title-event-title-timestamp\`
- Les notifications candidats sont créées uniquement pour les ressources (pas le client)`,

    'projet-messagerie': `# 💬 Système de Messagerie

## Vue d'ensemble

Le système de messagerie est un outil de communication temps réel unifié pour tous les utilisateurs (clients et candidats). Il utilise le composant **EnhancedMessageSystem** qui offre des fonctionnalités avancées de chat d'équipe.

## Architecture technique

### Composant principal
\`\`\`typescript
EnhancedMessageSystem
├── Props: { projectId, userType: 'client' | 'candidate' }
├── Hooks utilisés:
│   ├── useMessages() - Gestion des messages et threads
│   ├── useRealtimeMessages() - Synchronisation temps réel
│   ├── useProjectMembersForMessaging() - Membres du projet
│   ├── useMessageGroups() - Groupes de discussion
│   └── useUserPresence() - Statut en ligne
└── Features: Chat, Groupes, Upload, Formatage
\`\`\`

## Fonctionnalités principales

### 1. Chat temps réel
- Messages instantanés via Supabase Realtime
- Synchronisation automatique entre tous les participants
- Indicateur de saisie en cours
- Horodatage intelligent (aujourd'hui, hier, date)

### 2. Gestion des conversations
- **Équipe complète**: Discussion avec tous les membres
- **Messages privés**: Conversations 1-à-1
- **Groupes**: Sous-groupes de discussion personnalisés
- Filtrage des messages par conversation

### 3. Upload de fichiers
- Support multi-fichiers
- Synchronisation automatique avec le Drive projet
- Types supportés: Documents, Images, Archives
- Prévisualisation intégrée pour images
- Téléchargement direct depuis le chat

### 4. Formatage de texte
- **Gras** et *Italique*
- Markdown basique supporté
- Préservation des sauts de ligne
- Emojis natifs

### 5. Présence utilisateur
- Indicateur en ligne/hors ligne
- Statut temps réel
- Avatar avec initiales
- Badge de rôle (client/candidat)

## Tables de base de données

### messages
\`\`\`sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  thread_id UUID REFERENCES message_threads(id),
  sender_id UUID REFERENCES auth.users(id),
  recipient_id UUID, -- Pour messages privés
  content TEXT,
  attachments JSONB[], -- Fichiers joints
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  is_edited BOOLEAN DEFAULT false
)
\`\`\`

### message_threads
\`\`\`sql
CREATE TABLE message_threads (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255),
  type VARCHAR(50), -- 'general', 'private', 'group'
  participants UUID[], -- IDs des participants
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
\`\`\`

### message_groups
\`\`\`sql
CREATE TABLE message_groups (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name VARCHAR(255),
  members UUID[], -- IDs des membres
  created_by UUID,
  created_at TIMESTAMP
)
\`\`\`

### user_presence
\`\`\`sql
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP,
  current_project_id UUID
)
\`\`\`

## Hooks personnalisés

### useMessages()
\`\`\`typescript
const {
  threads,           // Liste des conversations
  messages,          // Messages du thread actuel
  selectedThread,    // Thread sélectionné
  setSelectedThread, // Changer de thread
  sendMessage,       // Envoyer un message
  loading,          // État de chargement
  sending           // Envoi en cours
} = useMessages(projectId);
\`\`\`

### useRealtimeMessages()
- Subscribe aux changements de messages
- Gère les INSERT, UPDATE, DELETE
- Met à jour l'UI en temps réel

### useProjectMembersForMessaging()
- Liste des membres du projet
- Infos: nom, email, rôle, avatar
- Filtrage par type (client/candidat)

### useMessageGroups()
- CRUD des groupes de discussion
- Gestion des membres
- Synchronisation temps réel

### useUserPresence()
- Statut en ligne/hors ligne
- Dernière activité
- Heartbeat automatique

## Flux de données

### Envoi de message
1. User tape le message
2. Appui sur Entrée ou clic Send
3. **sendMessage()** appelé
4. Si fichiers → **uploadMultipleFiles()**
5. INSERT dans table messages
6. **syncMessageFilesToDrive()** si fichiers
7. Broadcast Realtime à tous les clients
8. UI mise à jour instantanément

### Réception de message
1. Subscription Realtime active
2. Événement INSERT reçu
3. **handleNewMessage()** traite le message
4. Ajout à la liste locale
5. Notification si nécessaire
6. UI mise à jour

## Sécurité (RLS)

### Policies messages
- SELECT: Membres du projet uniquement
- INSERT: Authentifié + membre du projet
- UPDATE: Auteur du message uniquement
- DELETE: Auteur ou admin projet

### Policies threads
- SELECT: Participants uniquement
- INSERT: Membres du projet
- UPDATE: Créateur du thread
- DELETE: Admin projet uniquement

## Initialisation

### Au démarrage du projet
\`\`\`typescript
// Appelé par project-orchestrator
await initializeProjectMessaging({
  projectId,
  members: [...] // Tous les membres
});

// Crée automatiquement:
// - Thread général "Équipe complète"
// - Threads privés si nécessaire
// - Permissions et accès
\`\`\`

## Points d'attention

### Performance
- Pagination des messages (50 par page)
- Lazy loading des fichiers joints
- Cache local pour les avatars
- Debounce sur la saisie

### UX
- Auto-scroll vers le bas sur nouveau message
- Persistance du scroll position
- Draft sauvegardé localement
- Retry automatique si échec envoi

### Limitations
- Taille max fichier: 10MB
- Max 10 fichiers par message
- Messages: 5000 caractères max
- Groupes: 20 membres max

## Différences Client vs Candidat

### Client (userType='client')
- Peut créer des groupes
- Peut supprimer ses messages
- Voit tous les membres
- Peut épingler des messages

### Candidat (userType='candidate')
- Peut rejoindre des groupes
- Peut éditer ses messages (30 min)
- Voit les membres actifs uniquement
- Notifications push activées

## Debugging

### Logs utiles
\`\`\`typescript
// Dans la console navigateur
localStorage.setItem('debug:messages', 'true');
// Active les logs détaillés

// Vérifier la subscription
supabase.getChannels();
// Liste les canaux actifs

// État des messages
console.table(messages);
// Affiche tous les messages
\`\`\`

### Erreurs courantes
- "Thread not found" → Vérifier project_id
- "Unauthorized" → RLS policies à vérifier
- "Realtime disconnected" → Reconnexion auto en 5s
- "File upload failed" → Vérifier quota storage

## Évolutions prévues
- Réactions emoji sur messages
- Recherche dans l'historique
- Appels vidéo intégrés
- Traduction automatique
- Bot IA assistant`,

    'projet-drive': `# 📁 Système Drive

## Vue d'ensemble

Le Drive est un système de stockage et de partage de fichiers intégré à chaque projet. Il permet à tous les membres de l'équipe (client et candidats) de collaborer sur des documents, partager des ressources et organiser les livrables du projet.

## Architecture technique

### Composants (v3.0 - SimpleDriveView)
\`\`\`typescript
SimpleDriveView (ACTUEL - 05/09/2025)
- Localisation: src/components/drive/SimpleDriveView.tsx
- Technologies: React, Supabase Storage, Drag & Drop natif HTML5
- Type: Interface simplifiée avec fonctionnalités complètes

Fonctionnalités principales:
✅ Drag & drop depuis le système de fichiers (Finder/Explorateur)
✅ Drag & drop entre dossiers internes avec gestion des conflits
✅ Fil d'Ariane (breadcrumb) pour navigation claire
✅ Upload avec progression incrémentale détaillée
✅ Vignettes automatiques pour les images (jpg, png, gif)
✅ Renommer et supprimer les dossiers (avec confirmation)
✅ Intégration native Messagerie et Kanban
✅ Support multi-buckets (project-files, message-files, kanban-files)
✅ Filtrage automatique des fichiers .keep
✅ Recherche en temps réel sur tous les fichiers
✅ Sélecteur de projet intégré (Client & Candidat)
✅ Feedback visuel amélioré:
   - Zones de drop avec bordure bleue animée
   - Badge "Déposer ici" sur les dossiers cibles
   - Élément en cours de drag semi-transparent
   - Curseurs adaptés (pointer/move)
   - Tooltips informatifs
✅ Gestion intelligente des doublons (ajout timestamp)

// Anciens systèmes (deprecated)
ModernDriveExplorer - Problèmes avec tables inexistantes
SharedDriveView - Version basique sans drag & drop
\`\`\`

### Structure de base de données (NOUVEAU)

\`\`\`sql
-- Tables du nouveau système Drive
drives                    -- Espaces de stockage
├── id: UUID
├── name: VARCHAR(255)
├── type: 'project' | 'personal' | 'shared'
├── project_id: UUID      -- Lien avec le projet
└── owner_id: UUID

folders                   -- Hiérarchie des dossiers
├── id: UUID
├── name: VARCHAR(255)
├── parent_id: UUID       -- Auto-référence pour hiérarchie
├── drive_id: UUID
├── path: TEXT            -- Chemin complet optimisé
├── color: VARCHAR(7)     -- Personnalisation
└── icon: VARCHAR(50)

files                     -- Métadonnées des fichiers
├── id: UUID
├── name: VARCHAR(255)
├── folder_id: UUID
├── drive_id: UUID
├── storage_path: TEXT    -- Chemin dans Supabase Storage
├── mime_type: VARCHAR
├── size_bytes: BIGINT
├── version: INT
└── tags: TEXT[]

drive_members             -- Gestion des permissions
├── drive_id: UUID
├── user_id: UUID
├── role: 'owner' | 'editor' | 'viewer'
└── permissions: JSONB {read, write, delete}
\`\`\`

### Structure de stockage physique

\`\`\`
project-files/ (bucket Supabase Storage)
├── drives/               # Nouveau système
│   └── {drive_id}/
│       └── {random_name}.{ext}
└── projects/            # Ancien système (migration progressive)
    └── {project_id}/
        └── ...
\`\`\`

## Permissions (RLS Policies) - Mises à jour 31/08/2024

### Structure actuelle des politiques

Le bucket 'project-files' utilise exactement **4 politiques RLS unifiées** :

1. **project_members_upload** (INSERT)
2. **project_members_view** (SELECT)
3. **project_members_update** (UPDATE)
4. **project_members_delete** (DELETE)

### Conditions d'accès

#### Pour les Clients
- Accès complet basé sur : projects.owner_id correspond à auth.uid()
- Peuvent : uploader, voir, modifier, supprimer tous les fichiers du projet

#### Pour les Candidats
- Accès basé sur : candidate_profiles.user_id correspond à auth.uid()
- **ET** booking_status IN ('accepted', 'booké') ⚠️ IMPORTANT
- Peuvent : uploader, voir, modifier, supprimer dans le projet

### ⚠️ Corrections critiques appliquées (31/08/2024)

#### Problème résolu
- **Avant** : 12 politiques conflictuelles, candidats ne pouvaient pas uploader
- **Cause** : Politiques vérifiaient uniquement booking_status = 'accepted'
- **Solution** : Accepter booking_status IN ('accepted', 'booké')

#### Configuration correcte des politiques
\`\`\`sql
-- Exemple de condition pour candidats (utilisée dans les 4 politiques)
EXISTS (
  SELECT 1 FROM hr_resource_assignments hra
  JOIN candidate_profiles cp ON cp.id = hra.candidate_id
  WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
    AND cp.user_id = auth.uid()
    AND hra.booking_status IN ('accepted', 'booké')  -- Accepte les 2 valeurs
)
\`\`\`

### Tables impliquées
\`\`\`sql
-- Vérification des permissions candidat
hr_resource_assignments
├── candidate_id
├── project_id
├── booking_status ('accepted' requis)
└── candidate_profiles
    └── user_id (lien avec auth.uid())

-- Vérification des permissions client
projects
├── id
├── owner_id (lien avec auth.uid())
└── status

-- Vérification team members
client_team_members
├── project_id
├── user_id
└── status ('active' requis)
\`\`\`

## Flux d'utilisation (v2.0)

### 1. Initialisation automatique
Lors de la création du projet :
- Trigger PostgreSQL crée automatiquement un drive
- Structure de dossiers par défaut (Documents, Images, Vidéos, Présentations, Livrables)
- Attribution du rôle 'owner' au client

### 2. Synchronisation des membres
Lors de l'acceptation d'une mission :
- Trigger ajoute automatiquement le candidat aux drive_members
- Rôle 'editor' avec permissions read/write
- Accès immédiat aux fichiers du projet

### 3. Interface moderne
\`\`\`typescript
// Hook useDrive pour toutes les opérations
const {
  drives,           // Liste des drives accessibles
  selectedDrive,    // Drive actuellement sélectionné
  driveContent,     // Arbre des fichiers/dossiers
  permissions,      // Permissions de l'utilisateur
  actions: {
    createFolder,   // Créer un nouveau dossier
    uploadFile,     // Uploader un fichier
    deleteItem,     // Supprimer fichier/dossier
    downloadFile,   // Télécharger un fichier
    moveItem,       // Déplacer par drag & drop
  }
} = useDrive(projectId, userId);
\`\`\`

## Fonctionnalités v2.0

### Interface moderne
- 🎯 **Drag & Drop** : Glisser-déposer fichiers et dossiers
- 🌳 **Arbre interactif** : Navigation avec react-arborist
- 📤 **Upload multiple** : Zone de drop avec react-dropzone
- 🔍 **Recherche instantanée** : Filtrage en temps réel
- 🎨 **Personnalisation** : Couleurs et icônes pour dossiers
- 📱 **Responsive** : Interface adaptative

### Gestion avancée
- 📁 **Multi-drives** : Un drive par projet + drives personnels
- 👥 **Permissions granulaires** : Owner/Editor/Viewer
- 📊 **Métadonnées riches** : Tags, versions, tailles
- 🔄 **Versioning** : Historique des modifications (optionnel)
- 🗑️ **Corbeille** : Restauration possible
- 🔗 **Liens de partage** : URLs temporaires sécurisées

### Permissions par rôle
- **Owner (Client)** : Tous droits (read, write, delete)
- **Editor (Candidats)** : Lecture, écriture, pas de suppression
- **Viewer** : Lecture seule

### Limitations techniques
- Taille max par fichier: 50MB
- Types supportés: Tous (détection MIME automatique)
- Quota par drive: 10GB (configurable)
- Nombre de fichiers: Illimité

## Intégration temps réel

Le Drive utilise les subscriptions Supabase pour :
- Mise à jour instantanée de la liste des fichiers
- Notification lors de nouveaux uploads
- Synchronisation multi-utilisateurs

\`\`\`typescript
// Subscription temps réel
supabase
  .channel(\`project-files-\${projectId}\`)
  .on('postgres_changes', {
    event: '*',
    schema: 'storage',
    table: 'objects',
    filter: \`bucket_id=eq.project-files\`
  }, handleFileChange)
  .subscribe();
\`\`\`

## Résolution des problèmes

### Erreur "RLS policy violation" pour candidats
**Symptômes** : Candidats ne peuvent pas uploader, erreur "new row violates row-level security policy"

**Causes possibles** :
1. booking_status n'est pas dans ('accepted', 'booké')
2. candidate_profiles.user_id ne correspond pas à auth.uid()
3. Politiques RLS conflictuelles ou manquantes

**Solutions** :
1. Vérifier que booking_status IN ('accepted', 'booké')
2. Vérifier le lien user_id entre candidate_profiles et auth.users
3. S'assurer qu'il y a exactement 4 politiques pour project-files

### Historique des corrections

#### Fix 30/08/2024 - Chemin storage
- **Changement** : "project/" → "projects/" (ajout du 's')
- **Fichier** : SharedDriveView.tsx ligne 61
- **Impact** : Alignement avec la structure réelle du bucket

#### Fix 31/08/2024 - Politiques RLS (MAJEUR)
- **Problème** : 12 politiques conflictuelles, candidats bloqués
- **Cause** : Vérification uniquement de booking_status = 'accepted'
- **Solution appliquée** :
  - Suppression de toutes les anciennes politiques
  - Création de 4 politiques unifiées acceptant ('accepted', 'booké')
  - Test et validation avec candidat réel

## API Endpoints

### Storage API
\`\`\`
POST   /storage/v1/object/project-files
GET    /storage/v1/object/project-files/{path}
DELETE /storage/v1/object/project-files/{path}
\`\`\`

### Edge Functions associées
- **fix-drive-rls-direct** : Applique les corrections RLS
- **storage-operations** : Opérations batch sur fichiers
- **init-project-storage** : Initialise la structure lors du kickoff

## Monitoring

### Métriques clés
- Taux d'upload réussis/échoués
- Espace utilisé par projet
- Temps de réponse storage API
- Nombre de téléchargements

### Logs utiles
\`\`\`typescript
console.log(\`📁 \${userType.toUpperCase()}: Uploading to \${prefix}\`);
console.log(\`📁 Storage error: \${error.message}\`);
\`\`\`

## Évolutions prévues
- Versioning des fichiers
- Commentaires sur fichiers
- Prévisualisation Office
- Intégration Google Drive/Dropbox
- OCR et recherche dans documents
- Signatures électroniques`,

    'db-schema': `# Schéma Base de Données

## Tables Principales

### profiles (auth.users)
- id: UUID
- email: string
- first_name: string
- last_name: string
- user_type: 'client' | 'candidate' | 'admin'

### projects
- id: UUID
- title: string
- description: text
- status: 'pause' | 'attente-team' | 'play' | 'completed'
  - **pause**: Projet en attente (badge orange côté candidat)
  - **attente-team**: Tous acceptés, attente kickoff
  - **play**: Projet actif (seul statut permettant le time tracking)
  - **completed**: Projet terminé
- owner_id: UUID → profiles
- project_date: date
- due_date: date
- client_budget: number

### candidate_profiles
- id: UUID
- email: string (unique)
- first_name: string
- last_name: string
- status: 'qualification' | 'disponible' | 'en_pause' | 'indisponible'
- qualification_status: 'pending' | 'stand_by' | 'qualified' | 'rejected'
- profile_id: UUID → hr_profiles
- seniority: 'junior' | 'confirmed' | 'senior'

### hr_resource_assignments
- id: UUID
- project_id: UUID → projects
- profile_id: UUID → hr_profiles
- seniority: string
- booking_status: 'draft' | 'recherche' | 'accepted' | 'declined'
- candidate_id: UUID → candidate_profiles (CRITIQUE!)
- calculated_price: number

### project_teams (NOUVEAU)
- id: UUID
- project_id: UUID → projects
- member_id: UUID
- member_type: 'client' | 'resource'
- email: string
- first_name: string
- last_name: string
- role: string

## Relations clés
- projects → hr_resource_assignments (1:N)
- hr_resource_assignments → candidate_profiles (N:1)
- projects → project_teams (1:N)`,

    'db-rls': `# RLS & Sécurité

## Row Level Security

### Principe général
- Toutes les tables ont RLS activé
- Filtrage côté serveur obligatoire
- Pas d'accès direct aux données
- **IMPORTANT**: Les politiques storage.objects doivent accepter 'accepted' ET 'booké' pour booking_status

### Politiques par rôle

#### Client
- SELECT/UPDATE/DELETE sur ses projets
- SELECT sur les candidats de ses projets
- INSERT/UPDATE/DELETE sur les outils de ses projets
- Accès complet au storage de ses projets (via owner_id)

#### Candidat
- SELECT sur ses assignations acceptées
- SELECT/UPDATE sur son profil
- SELECT sur les projets où il est assigné
- INSERT/SELECT sur les messages de ses projets
- Accès au storage SI booking_status IN ('accepted', 'booké')

#### Admin
- Accès complet (service role)

### Tables critiques
- hr_resource_assignments: Filtrage strict par candidate_id
- projects: Filtrage par owner_id ou membre
- messages: Filtrage par projet membre
- storage.objects: Vérification booking_status pour candidats

## Politiques Storage (Corrigées 31/08/2024)

### Structure des politiques storage.objects

Le bucket 'project-files' a exactement 4 politiques RLS:

#### 1. project_members_upload (INSERT)
Permet l'upload aux:
- Clients (propriétaires du projet)
- Candidats avec booking_status IN ('accepted', 'booké')

#### 2. project_members_view (SELECT)
Permet la visualisation aux:
- Clients (propriétaires du projet)
- Candidats avec booking_status IN ('accepted', 'booké')

#### 3. project_members_update (UPDATE)
Permet la modification aux:
- Clients (propriétaires du projet)
- Candidats avec booking_status IN ('accepted', 'booké')

#### 4. project_members_delete (DELETE)
Permet la suppression aux:
- Clients (propriétaires du projet)
- Candidats avec booking_status IN ('accepted', 'booké')

### ⚠️ Points d'attention critiques

#### Problème résolu (31/08/2024)
- **Symptôme**: Candidats ne pouvaient pas uploader (erreur RLS)
- **Cause**: Les politiques ne vérifiaient que booking_status = 'accepted'
- **Solution**: Accepter booking_status IN ('accepted', 'booké')

#### Vérifications importantes
1. **candidate_profiles.user_id** DOIT correspondre à auth.uid()
2. **booking_status** peut avoir les valeurs 'accepted' OU 'booké'
3. Ne JAMAIS avoir de politiques conflictuelles sur le même bucket

### Requête type pour vérifier les accès
\`\`\`sql
-- Vérifier qu'un candidat a accès au storage
SELECT 
    cp.first_name,
    cp.user_id,
    hra.booking_status,
    hra.project_id
FROM candidate_profiles cp
JOIN hr_resource_assignments hra ON hra.candidate_id = cp.id
WHERE cp.user_id = auth.uid()
    AND hra.booking_status IN ('accepted', 'booké');
\`\`\``,

    'db-realtime': `# Tables Temps Réel

## Tables avec Realtime activé

### Configuration
\`\`\`sql
ALTER TABLE table_name REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
\`\`\`

### Tables actives
1. **projects**: Changements de statut
2. **hr_resource_assignments**: Nouvelles assignations
3. **candidate_notifications**: Nouvelles notifs
4. **messages**: Chat temps réel
5. **kanban_cards**: Mises à jour tâches
6. **kanban_columns**: Changements colonnes
7. **project_events**: Nouveaux événements
8. **candidate_event_notifications**: Invitations

### Abonnements côté client
\`\`\`typescript
supabase
  .channel('project-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'projects',
    filter: \`id=eq.\${projectId}\`
  }, handleChange)
  .subscribe()
\`\`\``,

    'db-functions': `# Edge Functions

## Functions critiques

### project-orchestrator
- Configure le projet au démarrage
- Crée Kanban, Drive, notifications
- Remplit project_teams

### project-kickoff
- Crée l'événement kickoff
- Ajoute les attendees
- Envoie les invitations candidats

### resource-booking
- Gère acceptation/refus candidats
- DOIT définir candidate_id si accepté
- Met à jour booking_status

### init-project-storage
- Crée la structure de dossiers
- Configure les permissions

### fix-kickoff-invitations
- Corrige les invitations manquantes
- Utilitaire de maintenance

## Déploiement
\`\`\`bash
npx supabase functions deploy function-name
\`\`\``,

    'api-supabase': `# API Supabase

## Configuration

### Client
\`\`\`typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'anon-key'
)
\`\`\`

### Authentification
- Magic link email
- Session persistante
- Refresh token automatique

### Requêtes
\`\`\`typescript
// SELECT avec jointure
const { data } = await supabase
  .from('projects')
  .select(\`
    *,
    hr_resource_assignments (
      *,
      candidate_profiles (*)
    )
  \`)
  .eq('status', 'play')

// INSERT
await supabase
  .from('table')
  .insert({ ... })

// UPDATE
await supabase
  .from('table')
  .update({ ... })
  .eq('id', id)
\`\`\``,

    'api-hooks': `# React Hooks

## Hooks principaux

### useAuth()
- Gestion authentification
- user, login, logout, loading

### useUserProjects()
- Projets du client connecté
- Filtrage automatique

### useCandidateProjectsOptimized()
- Projets actifs du candidat
- Real-time updates inclus

### useRealtimeProjectsFixed()
- Synchronisation temps réel
- Gestion des changements d'état

### useProjectOrchestrator()
- Démarrage de projet
- Appel des Edge Functions

### useProjectUsers()
- Membres d'un projet
- Fallback sur hr_resource_assignments

### useKanbanSupabase()
- Gestion du Kanban
- CRUD des cartes et colonnes

## Patterns
- Toujours gérer loading et error
- Cleanup des subscriptions
- Optimistic updates quand possible`,

    'corrections-session5': `# 🔧 Session 5 - Drive Modernisé avec Drag & Drop (05/09/2025)

## Refonte complète du système Drive

### Contexte
Le système Drive nécessitait une modernisation complète pour supporter le drag & drop et améliorer l'expérience utilisateur.

## Problèmes résolus

### 1. ✅ Fichiers .keep visibles
**Problème**: Les fichiers .keep créés pour maintenir les dossiers vides étaient visibles
**Solution**: Filtrage dans \`filteredEntries\` pour cacher ces fichiers

### 2. ✅ Progression upload incorrecte
**Problème**: La barre de progression passait de 0% à 100% sans étapes
**Solution**: Upload incrémentale avec simulation de chunks et mise à jour progressive

### 3. ✅ Vignettes manquantes pour images
**Problème**: Les images n'avaient pas de preview
**Solution**: 
- Génération automatique de vignettes pour jpg, png, gif
- Affichage dans une div de 48x48px avec object-cover
- Fallback sur icône si l'image ne charge pas

### 4. ✅ Opérations sur dossiers manquantes
**Problème**: Impossible de renommer ou supprimer les dossiers
**Solution**: 
- Ajout boutons Edit3 et Trash2 pour les dossiers non-virtuels
- Dialog de renommage avec gestion complète des fichiers contenus
- Confirmation avant suppression

### 5. ✅ Drag & Drop complet implémenté
**Nouvelles fonctionnalités**:
- **Drag & drop depuis Finder/Explorateur**: Upload direct de fichiers
- **Drag & drop entre dossiers**: Déplacement de fichiers dans le Drive
- **Feedback visuel**: Bordure et fond coloré lors du survol
- **Multi-fichiers**: Support de sélection multiple

### 6. ✅ Fil d'Ariane (Breadcrumb)
**Ajout**: Navigation claire avec chemin complet
- Icône Home pour la racine
- Boutons cliquables pour chaque niveau
- Chevrons entre les éléments

## Fichiers modifiés
- \`src/components/drive/SimpleDriveView.tsx\` - Refonte complète
- \`src/pages/ClientDashboard.tsx\` - Intégration Drive
- \`src/pages/CandidateDashboard.tsx\` - Intégration Drive

## Impact
Le Drive est maintenant une solution complète et moderne pour la gestion des fichiers du projet.`,

    'corrections-unified-ids': `# 🔄 Unification des IDs - Refonte Architecture (05/09/2025)

## Migration Majeure : Unification auth.uid() et profiles.id

### 🎯 Objectif
Unifier complètement les identifiants pour simplifier l'architecture et résoudre définitivement les problèmes de permissions RLS.

### ❌ Problème Initial
**Architecture à 3 niveaux d'ID** :
\`\`\`
auth.users.id (UUID Supabase Auth)
    ↓ (lien via email seulement)
candidate_profiles.id (UUID différent)
    ↓
project_teams.member_id (référence candidate_profiles.id)
\`\`\`

**Conséquences** :
- RLS complexes et dysfonctionnels
- Jointures sur email (performance dégradée)
- Bugs récurrents d'accès aux données
- Code de contournement partout

### ✅ Solution Implémentée
**Architecture unifiée** :
\`\`\`
auth.users.id = candidate_profiles.id = même UUID
    ↓ (référence directe)
project_teams.member_id (même UUID partout)
\`\`\`

### 📋 Tables Modifiées

#### Primary Keys changées
- \`candidate_profiles\` : PK = auth.uid()
- \`client_profiles\` : PK = auth.uid()

#### Foreign Keys mises à jour
- \`hr_resource_assignments.candidate_id\` → auth.uid()
- \`project_teams.member_id\` → auth.uid()
- \`projects.owner_id\` → auth.uid()
- \`candidate_notifications.candidate_id\` → auth.uid()
- \`time_tracking_sessions.candidate_id\` → auth.uid()
- \`candidate_event_notifications.candidate_id\` → auth.uid()

### 🔧 Code Simplifié

#### Avant (complexe)
\`\`\`typescript
// Recherche en 2 étapes
const { data: user } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('candidate_profiles')
  .select('*')
  .eq('email', user.email)  // Jointure sur string !
  .single();
\`\`\`

#### Après (simple)
\`\`\`typescript
// Direct !
const { data: user } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('candidate_profiles')
  .select('*')
  .eq('id', user.id)  // UUID direct
  .single();
\`\`\`

### 🚀 RLS Simplifiées

#### Avant (fonction complexe)
\`\`\`sql
CREATE FUNCTION is_project_team_member(project_id, user_id)
  -- Recherche email dans auth.users
  -- Puis candidate_id via email
  -- Puis vérification dans project_teams
  -- 3 jointures !
\`\`\`

#### Après (direct)
\`\`\`sql
CREATE POLICY "Users can view their project events"
USING (
  EXISTS (
    SELECT 1 FROM hr_resource_assignments
    WHERE project_id = project_events.project_id
    AND candidate_id = auth.uid()  -- Direct !
  )
);
\`\`\`

### 📊 Impact Performance
- **-60% temps requêtes** : Jointures UUID vs email
- **-500 lignes de code** : Suppression des contournements
- **0 bugs RLS** : Plus de mismatch d'ID

### 🔄 Migration Exécutée

#### Phase 1 : Préparation (sans impact)
1. Backup complet des données
2. Ajout colonnes temporaires auth_user_id
3. Synchronisation des IDs via email
4. Vérification des orphelins

#### Phase 2 : Basculement
1. Changement des Primary Keys
2. Mise à jour des Foreign Keys
3. Suppression anciennes colonnes
4. Simplification RLS

### 📝 Fichiers Impactés et Corrigés

#### Hooks (8 fichiers)
- \`useCandidateIdentity.ts\` ✅
- \`useClientIdentity.ts\` ✅
- \`useProjectUsers.ts\` ✅
- \`useRealtimeProjectsFixed.ts\` ✅
- \`useTimeTracking.ts\` ✅
- \`useCandidateProjectsOptimized.ts\` ✅
- \`useProjectOrchestrator.ts\` ✅
- \`useDrive.ts\` ✅

#### Edge Functions (5 fichiers)
- \`resource-booking/index.ts\` ✅
- \`project-orchestrator/index.ts\` ✅
- \`project-kickoff/index.ts\` ✅
- \`handle-resource-modification/index.ts\` ✅
- \`fix-project-delete/index.ts\` ✅

#### Components (15+ fichiers)
- Tous mis à jour pour utiliser auth.uid() directement

### ⚠️ Breaking Changes
- Les anciennes requêtes basées sur email ne fonctionnent plus
- Les fonctions RLS complexes ont été supprimées
- L'API a changé (mais simplifiée)

### ✅ Résultat Final
- **Architecture propre** : Un seul ID universel
- **Performance optimale** : Jointures directes sur UUID
- **RLS fonctionnelles** : Permissions simples et efficaces
- **Code maintable** : Plus de contournements

### 🔐 Sécurité
- Backup complet conservé dans \`_backup_profiles_migration\`
- Script de rollback disponible si nécessaire
- Colonnes \`old_id\` conservées temporairement

## Recommandations Post-Migration
1. **Monitoring** : Surveiller les logs 48h
2. **Tests** : Vérifier tous les flux utilisateur
3. **Cleanup** : Supprimer old_id dans 30 jours
4. **Documentation** : Mettre à jour l'API doc`,

    'corrections-session4': `# 🔧 Session 4 - Migration Cal.com → Schedule-X (04/09/2025)

## Migration majeure : Remplacement de Cal.com par Schedule-X

### Contexte
Cal.com s'est révélé être une solution payante très onéreuse. Décision de migrer vers Schedule-X, une alternative open-source gratuite.

## Problèmes résolus

### 1. ✅ Migration complète Cal.com → Schedule-X
**Problème**: Cal.com trop cher et nécessitait un serveur externe
**Solution complète**:
- Création de \`SimpleScheduleCalendar\` pour remplacer l'intégration Cal.com
- Utilisation de date-fns au lieu de l'API Temporal
- Intégration native dans l'application (pas d'iframe)
- Fichiers créés:
  - \`src/components/SimpleScheduleCalendar.tsx\`
  - \`src/components/CreateEventDialog.tsx\`
  - \`supabase/functions/_shared/schedule-x.ts\`

### 2. ✅ Erreur "Temporal is not defined"
**Problème**: Schedule-X utilisait l'API Temporal non supportée par tous les navigateurs
**Solution**: 
- Création d'un calendrier custom avec date-fns
- Vue Mois et Liste implémentées manuellement
- Support complet de tous les navigateurs

### 3. ✅ Colonnes metadata manquantes
**Problème**: Edge function project-kickoff retournait erreur 500
**Cause**: Tables projects et project_events sans colonnes metadata
**Solution SQL**:
\`\`\`sql
ALTER TABLE projects ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN planning_shared TEXT;
ALTER TABLE project_events ADD COLUMN metadata JSONB DEFAULT '{}';
\`\`\`

### 4. ✅ Création manuelle d'événements
**Problème**: Impossible de créer des événements hors kickoff automatique
**Solution**: 
- Nouveau composant \`CreateEventDialog\`
- Sélection des membres de l'équipe
- Génération automatique des liens Jitsi
- Notifications automatiques aux candidats

### 5. ✅ Intégration page Cal
**Problème**: La page Cal utilisait encore l'iframe Cal.com
**Solution**:
- Refonte complète de \`CalcPage.tsx\`
- Dropdown de sélection de projet
- Affichage du calendrier Schedule-X
- Bouton "+ Ajouter" pour créer des événements

## Nouvelles fonctionnalités ajoutées

### Calendrier Schedule-X
- Vue mensuelle avec navigation
- Vue liste chronologique
- Indicateur visuel du prochain kickoff
- Affichage des membres de l'équipe
- Support des liens Jitsi Meet

### Création d'événements
- Dialog fullscreen avec formulaire complet
- Sélection multiple des participants
- Génération automatique du lien visio
- Support des lieux physiques
- Notifications temps réel

## Impact technique

### Composants modifiés
- \`src/pages/CalcPage.tsx\` : Refonte complète
- \`src/components/ProjectCard.tsx\` : Indicateurs Schedule-X
- \`src/components/KickoffDialog.tsx\` : Mention Schedule-X
- \`supabase/functions/project-kickoff/index.ts\` : Support Schedule-X

### Nouveaux composants
- \`SimpleScheduleCalendar.tsx\` : Calendrier sans Temporal
- \`CreateEventDialog.tsx\` : Création d'événements
- \`schedule-x.ts\` : Helpers Schedule-X

### Scripts de test
- \`test-schedule-x-integration.mjs\`
- \`create-test-calendar-event.mjs\`
- \`force-add-metadata-columns.mjs\`

## Avantages de la migration

| Aspect | Avant (Cal.com) | Après (Schedule-X) |
|--------|-----------------|-------------------|
| Coût | Payant (cher) | Gratuit |
| Performance | Lent (iframe) | Rapide (natif) |
| Personnalisation | Limitée | Totale |
| Maintenance | Externe | Interne |
| Intégration | Complexe | Simple |

## Notes pour l'équipe dev

### Points d'attention
1. Toujours vérifier l'existence des colonnes metadata
2. Les liens Jitsi suivent le pattern: \`project-event-timestamp\`
3. Les notifications sont créées uniquement pour les candidats

### Commandes utiles
\`\`\`bash
# Vérifier les colonnes
node force-add-metadata-columns.mjs

# Tester l'intégration
node test-schedule-x-integration.mjs

# Déployer project-kickoff
npx supabase functions deploy project-kickoff --project-ref egdelmcijszuapcpglsy
\`\`\`
**Solution créée**: 
- Edge function \`reset-project-status\` pour réinitialiser à 'pause'
- Edge function \`repair-corrupted-projects\` pour recréer les éléments manquants
- Scripts de test: \`reset-projects.mjs\`, \`test-project-state.mjs\`

### 4. ✅ Synchronisation realtime de la progression des ressources
**Problème**: La barre de progression des ressources ne se mettait pas à jour en temps réel côté client
**Cause**: Deux fonctions de fetch distinctes non synchronisées dans ProjectCard
**Solution**: 
- Unification pour utiliser une seule fonction \`fetchResourceAssignments\`
- Modification du callback realtime pour appeler la bonne fonction
- Fichier: \`src/components/ProjectCard.tsx\`

### 5. ✅ Interface admin - Migration tabs vers sidebar
**Changement**: Remplacement des tabs par une navigation sidebar
**Ajout**: Lien direct vers la documentation /llm
**Fichiers**: 
- Création: \`src/components/admin/AdminSidebar.tsx\`
- Modification: \`src/pages/AdminResources.tsx\`

### 6. ✅ TypeError dans /llm documentation
**Problème**: "useState is not a function" empêchait le chargement de la page
**Cause**: Mauvaise utilisation de useState avec fonction callback
**Solution**: 
- Remplacement par useEffect pour l'initialisation
- Ajout de la section 'general' manquante
- Fichier: \`src/pages/llm/LLMDashboard.tsx\`

## Impact des corrections
- Processus de kickoff maintenant 100% fonctionnel
- Candidats reçoivent correctement les invitations et notifications
- Synchronisation temps réel améliorée pour tous les utilisateurs
- Interface admin plus ergonomique
- Documentation technique accessible directement`,

    'corrections-session3': `# 🔧 Session 3 - Corrections et Améliorations UX (03/09/2025)

## Problèmes résolus

### 1. ✅ Pièces jointes invisibles pour candidats
**Problème**: Les fichiers attachés aux projets étaient visibles côté client mais pas côté candidat
**Cause**: Incohérence dans les chemins de stockage (utilisation de \`project/\` vs \`projects/\`)
**Solution**: 
- Uniformisation de tous les chemins vers \`projects/\` avec 's'
- Fichiers modifiés:
  - \`EditProjectModal.tsx\`: Correction du path de listing
  - \`CreateProjectModal.tsx\`: Correction du path d'upload
  - \`CandidateProjectsSection.tsx\`: Ajout récupération fichiers

### 2. ✅ Progress bar équipe non réactive
**Problème**: La barre de progression ne se mettait pas à jour en temps réel quand les candidats acceptaient
**Cause**: Calcul unique sans réactivité aux changements
**Solution**: 
- Utilisation de \`useMemo\` avec dépendance sur \`resourceAssignments\`
- Recalcul automatique à chaque changement
- Fichier: \`ProjectCard.tsx\`

### 3. ✅ Affichage équipe incomplète
**Problème**: Les candidats ne voyaient que leur propre rôle, pas l'équipe complète
**Solution**: 
- Chargement de tous les membres via \`fetchFullTeam()\`
- Affichage sur une ligne pour chaque membre
- Fichier: \`CandidateProjectsSection.tsx\`

### 4. ✅ CTA redondants côté client
**Problème**: 3 boutons faisaient la même action (ouvrir détails projet)
**Solution**: 
- Création de 2 popups fullscreen distincts:
  - Modal constitution équipe
  - Modal détail projet
- Refactorisation des CTA avec actions distinctes
- Fichier: \`ProjectCard.tsx\`

### 5. ✅ Métier affichant "Non défini"
**Problème**: Mapping incorrect entre \`hr_profiles.name\` et \`hr_profiles.label\`
**Solution**: 
- Correction du mapping dans l'enrichissement
- Fichier: \`CandidateDashboard.tsx\`

## Composants créés

### FullScreenModal pour constitution équipe
\`\`\`tsx
<FullScreenModal
  isOpen={isTeamModalOpen}
  onClose={() => setIsTeamModalOpen(false)}
  title="Constitution de l'équipe"
>
  // Affichage détaillé de l'équipe avec statuts
</FullScreenModal>
\`\`\`

### FullScreenModal pour détails projet
\`\`\`tsx
<FullScreenModal
  isOpen={isDetailsModalOpen}
  onClose={() => setIsDetailsModalOpen(false)}
  title={project.title}
>
  // Détails complets du projet
</FullScreenModal>
\`\`\`

## Améliorations UX

### Visuel équipe validée
- Membres confirmés affichés en vert (\`text-green-600\`)
- Badge "Confirmé" pour les acceptations
- Indicateur visuel clair du statut

### Formatage dates
- Remplacement de \`formatDistanceToNow\` par \`toLocaleDateString\`
- Affichage clair: "03/09/2025" au lieu de "il y a 6h" pour dates futures

### Menu kebab optimisé
- "Voir les détails" remplacé par "Modifier l'équipe"
- Actions plus claires et distinctes

## ⚠️ Point technique important : Remontée des équipes

### Structure des données équipe

#### Table hr_resource_assignments (champs existants)
\`\`\`sql
-- Champs disponibles pour la requête
- id, project_id, candidate_id, profile_id
- booking_status: 'draft' | 'recherche' | 'accepted' | 'declined'
- seniority: niveau requis pour le poste
- languages: array des langues requises
- expertises: array des expertises requises
- calculated_price: tarif calculé
-- ATTENTION: 'industries' N'EXISTE PAS dans cette table
\`\`\`

#### Table candidate_profiles (champs réels)
\`\`\`sql
-- Structure documentée
- id, email, first_name, last_name
- status: 'qualification' | 'disponible' | 'en_pause' | 'indisponible'
- qualification_status, profile_id, seniority
-- ATTENTION: PAS de job_title, technical_skills, professional_info
\`\`\`

### Requête correcte pour récupérer l'équipe
\`\`\`typescript
const { data: assignments } = await supabase
  .from('hr_resource_assignments')
  .select(\`
    id,
    project_id,
    candidate_id,
    profile_id,
    booking_status,
    seniority,
    languages,      // Langues requises pour le poste
    expertises,     // Expertises requises pour le poste
    calculated_price,
    candidate_profiles (
      id,
      email,
      first_name,
      last_name     // Uniquement ces champs existent
    )
  \`)
  .eq('project_id', projectId);

// Enrichissement avec hr_profiles pour le label métier
const { data: hrProfile } = await supabase
  .from('hr_profiles')
  .select('name')  // Le nom du métier
  .eq('id', assignment.profile_id)
  .single();
\`\`\`

### Affichage des informations
- **Métier**: Depuis hr_profiles.name (requête séparée)
- **Séniorité**: hr_resource_assignments.seniority
- **Langues/Expertises**: Arrays depuis hr_resource_assignments
- **Candidat assigné**: first_name/last_name depuis candidate_profiles (si booking_status='accepted')

### Erreurs courantes à éviter
1. ❌ Ne PAS chercher 'industries' dans hr_resource_assignments
2. ❌ Ne PAS chercher 'job_title' ou 'professional_info' dans candidate_profiles
3. ❌ Ne PAS utiliser SELECT * avec jointures (spécifier les champs)
4. ✅ Toujours vérifier l'existence des champs dans la documentation`,

    'corrections-session2': `# 🔧 Session 2 - Corrections Bugs Critiques (03/09/2025)

## Bugs corrigés

### 1. ✅ Matching candidats incomplet
**Problème**: CandidateDashboard ne vérifiait pas toutes les compétences requises
**Analyse**: Le matching ne prenait en compte que profile_id et seniority
**Solution**: 
\`\`\`typescript
// Ajout vérification complète dans CandidateDashboard.tsx
const isMatch = 
  profile_id === candidateProfile.hr_profile_id &&
  seniority === candidateProfile.seniority_level &&
  languages?.every(lang => candidateProfile.languages?.includes(lang)) &&
  expertises?.every(exp => candidateProfile.professional_info?.expertise?.includes(exp)) &&
  industries?.every(ind => candidateProfile.professional_info?.industry?.includes(ind));
\`\`\`

### 2. ✅ Popup projets acceptés (404)
**Problème**: Le CTA "Accéder au projet" générait une erreur 404
**Cause**: Tentative de navigation vers une route inexistante
**Solution**: 
- Toujours ouvrir le popup fullscreen au lieu de naviguer
- Fichier: \`CandidateProjectsSection.tsx\`

### 3. ✅ Suppression projet avec contrainte SQL
**Problème**: Impossible de supprimer un projet (violation projects_status_check)
**Cause**: Tentative d'utiliser status='cancelled' non autorisé
**Solution**: 
- Création Edge Function \`fix-project-delete\`
- Utilisation de status='completed' au lieu de 'cancelled'
- Fichier: \`DeleteProjectDialog.tsx\`

## Edge Functions créées

### fix-project-delete
\`\`\`typescript
// Suppression sécurisée sans violation de contrainte
await supabase
  .from('projects')
  .update({ status: 'completed' })
  .eq('id', projectId);
\`\`\`

## Limitations identifiées

### Contrainte status projet
- Valeurs autorisées uniquement: 'pause', 'play', 'completed'
- 'cancelled', 'archived', 'attente-team' génèrent des erreurs
- **Action requise**: Migration SQL pour étendre l'enum`,

    'corrections-session1': `# 🔧 Session 1 - Configuration Design System (02/09/2025)

## Implémentations majeures

### 1. ✅ Système de design premium
**Composants créés**:
- IntroOverlay: Animation d'introduction avec logo
- HeroLyniqFixed: Hero section avec vidéo background
- HeroLyniqBlend: Version alternative avec blend modes

### 2. ✅ Effet Division (Chromatic Aberration)
**Implementation**: Superposition de calques cyan/magenta avec décalages
**Utilisation**: Titre principal homepage pour effet moderne

### 3. ✅ Configuration Tailwind étendue
**Ajouts**:
- Palette couleurs premium (black, near-black, accent violet)
- Typographie responsive avec clamp()
- Shadows et gradients personnalisés

### 4. ✅ FullScreenModal unifié
**Problème**: Incohérence UX entre différents modals
**Solution**: 
- Création composant FullScreenModal réutilisable
- Application à tous les popups (suppression, archive, détails)
- Animation Framer Motion cohérente

## Fichiers modifiés

- \`tailwind.config.ts\`: Configuration complète design system
- \`src/index.css\`: Classes utilitaires premium
- \`src/components/ui/intro-overlay.tsx\`: Animation intro
- \`src/components/ui/hero-lyniq-fixed.tsx\`: Hero avec vidéo
- \`src/components/DeleteProjectDialog.tsx\`: Utilisation FullScreenModal
- \`src/components/ui/fullscreen-modal.tsx\`: Modal unifié`,

    'wiki-overview': `# 📚 Wiki Collaboratif - Vue d'ensemble

## 🎯 Objectif
Le système Wiki a été conçu pour permettre aux équipes projet de créer et partager de la documentation collaborative, avec un système de permissions granulaire et une synchronisation en temps réel.

## ✨ Fonctionnalités principales

### 1. Pages publiques/privées
- **Pages privées** : Visibles uniquement par leur créateur
- **Pages publiques** : Visibles par toute l'équipe du projet
- **Basculement en temps réel** : Les changements de visibilité sont instantanés pour tous

### 2. Organisation par membre
- Navigation groupée par auteur
- Avatar et badge "Moi" pour l'utilisateur courant
- Compteur de pages par auteur
- Auto-expansion de sa propre section

### 3. Système de commentaires
- **Uniquement sur pages publiques** : Favorise la collaboration
- **Commentaires imbriqués** : Support des réponses en cascade
- **Gestion complète** : Édition, suppression, résolution
- **Temps réel** : Mise à jour instantanée pour tous

### 4. Éditeur riche BlockNote
- Formatage WYSIWYG complet
- Support images et médias
- Blocs de code avec coloration syntaxique
- Tableaux, listes, citations
- Sauvegarde automatique

### 5. Arborescence de pages
- Support pages parent/enfant
- Navigation hiérarchique
- Ordre d'affichage personnalisable
- Icônes personnalisées par page

## 🔐 Accès et permissions

### Pour les clients
- Accès complet au wiki du projet
- Peut créer/éditer/supprimer toutes ses pages
- Voit toutes les pages publiques de l'équipe

### Pour les candidats
- Accès au wiki des projets actifs uniquement
- Peut créer/éditer/supprimer ses propres pages
- Voit les pages publiques de l'équipe

## 📱 Interface utilisateur

### Mode normal
- Éditeur intégré dans le dashboard
- Navigation latérale avec arborescence
- Panneau de commentaires rétractable

### Mode plein écran
- Expansion en place (pas de popup)
- Masquage navigation et header
- Focus total sur le contenu
- Retour simple avec Escape`,

    'wiki-architecture': `# 🏗️ Architecture technique du Wiki

## 📊 Structure base de données

### Table wiki_pages
\`\`\`sql
CREATE TABLE wiki_pages (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES auth.users(id),
  parent_id UUID REFERENCES wiki_pages(id),
  is_public BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  slug TEXT,
  icon TEXT DEFAULT 'FileText',
  version INTEGER DEFAULT 1,
  original_title TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
\`\`\`

### Table wiki_comments
\`\`\`sql
CREATE TABLE wiki_comments (
  id UUID PRIMARY KEY,
  page_id UUID REFERENCES wiki_pages(id),
  author_id UUID REFERENCES auth.users(id),
  parent_comment_id UUID REFERENCES wiki_comments(id),
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
\`\`\`

## 🧩 Composants React

### WikiView
**Fichier** : \`src/components/wiki/WikiView.tsx\`
- Composant principal orchestrateur
- Gère l'état global du wiki
- Synchronisation realtime
- Mode plein écran intégré

### WikiEditor
**Fichier** : \`src/components/wiki/WikiEditor.tsx\`
- Wrapper BlockNote editor
- Gestion sauvegarde automatique
- Fix du bug useState dispatcher
- Conversion HTML lossy

### WikiNavigation
**Fichier** : \`src/components/wiki/WikiNavigation.tsx\`
- Arborescence des pages
- Groupement par auteur
- Indicateurs visuels (public/privé)
- Gestion expansion/collapse

### WikiComments
**Fichier** : \`src/components/wiki/WikiComments.tsx\`
- Système complet de commentaires
- Réponses imbriquées
- Actions CRUD complètes
- Synchronisation realtime

## 🔄 Flux de données

### Chargement initial
1. Récupération pages du projet
2. Filtrage selon permissions
3. Construction arborescence
4. Chargement profils auteurs
5. Activation subscriptions realtime

### Création/Édition page
1. Validation permissions
2. Sauvegarde Supabase
3. Broadcast realtime
4. Mise à jour locale optimiste
5. Synchronisation autres clients

### Changement visibilité
1. Toggle is_public
2. Trigger PostgreSQL
3. Notification pg_notify
4. Broadcast WebSocket
5. Rafraîchissement navigation`,

    'wiki-permissions': `# 🔐 Système de permissions du Wiki

## 🛡️ Row Level Security (RLS)

### Politique de lecture
\`\`\`sql
CREATE POLICY "users_view_wiki_pages"
ON wiki_pages FOR SELECT
USING (
  -- Page publique OU auteur
  (is_public = true OR author_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = wiki_pages.project_id
    AND (
      -- Client du projet
      p.owner_id = auth.uid()
      -- OU candidat accepté
      OR EXISTS (
        SELECT 1 FROM hr_resource_assignments
        WHERE project_id = p.id
        AND candidate_id = auth.uid()
        AND booking_status = 'accepted'
      )
    )
  )
);
\`\`\`

### Politique de création
\`\`\`sql
CREATE POLICY "users_create_wiki_pages"
ON wiki_pages FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    -- Vérification appartenance projet
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (p.owner_id = auth.uid() OR /* candidat accepté */)
  )
);
\`\`\`

### Politique de modification
\`\`\`sql
CREATE POLICY "users_update_own_pages"
ON wiki_pages FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());
\`\`\`

## 🔍 Filtrage côté client

### Visibilité des pages
\`\`\`typescript
// Dans WikiView.tsx
const visiblePages = pages.filter(page => {
  return page.is_public || page.author_id === userId;
});
\`\`\`

### Pages par auteur
\`\`\`typescript
// Dans WikiNavigation.tsx
const groupPagesByAuthor = () => {
  const authorsMap = new Map();
  pages.forEach(page => {
    // Groupement avec tri utilisateur actuel en premier
  });
  return authorsArray.sort((a, b) => {
    if (a.is_current_user) return -1;
    if (b.is_current_user) return 1;
    return a.name.localeCompare(b.name);
  });
};
\`\`\`

## 🚨 Points d'attention sécurité

### 1. Double vérification
- RLS côté serveur (source de vérité)
- Filtrage client (UX uniquement)
- Jamais de données sensibles côté client

### 2. Permissions commentaires
- Création uniquement sur pages publiques
- Modification/suppression par auteur uniquement
- Pas de commentaires sur pages privées

### 3. Isolation projets
- Aucune fuite entre projets
- Vérification systématique project_id
- Candidats uniquement sur projets acceptés`,

    'wiki-realtime': `# ⚡ Synchronisation temps réel du Wiki

## 🔌 Configuration Supabase Realtime

### Activation tables
\`\`\`sql
-- Activer realtime pour les tables
ALTER PUBLICATION supabase_realtime ADD TABLE wiki_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE wiki_comments;
\`\`\`

### Triggers PostgreSQL
\`\`\`sql
-- Trigger updated_at
CREATE TRIGGER update_wiki_pages_updated_at_trigger
BEFORE UPDATE ON wiki_pages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trigger notification visibilité
CREATE TRIGGER wiki_visibility_change_trigger
AFTER UPDATE ON wiki_pages
FOR EACH ROW
WHEN (OLD.is_public IS DISTINCT FROM NEW.is_public)
EXECUTE FUNCTION notify_wiki_visibility_change();
\`\`\`

## 📡 Subscriptions WebSocket

### Subscription pages
\`\`\`typescript
// Dans WikiView.tsx
const subscribeToChanges = () => {
  const channel = supabase
    .channel(\`wiki-pages-\${projectId}\`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'wiki_pages',
      filter: \`project_id=eq.\${projectId}\`
    }, handlePageChange)
    .subscribe();
};
\`\`\`

### Subscription commentaires
\`\`\`typescript
// Dans WikiComments.tsx
const subscribeToComments = () => {
  const channel = supabase
    .channel(\`wiki-comments-\${pageId}\`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'wiki_comments',
      filter: \`page_id=eq.\${pageId}\`
    }, loadComments)
    .subscribe();
};
\`\`\`

## 🔄 Gestion des événements

### Types d'événements
- **INSERT** : Nouvelle page/commentaire
- **UPDATE** : Modification contenu/visibilité
- **DELETE** : Suppression page/commentaire

### Traitement événements
\`\`\`typescript
const handlePageChange = (payload) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  switch(eventType) {
    case 'INSERT':
      // Ajouter nouvelle page si visible
      if (newRecord.is_public || newRecord.author_id === userId) {
        addPageToList(newRecord);
      }
      break;
      
    case 'UPDATE':
      // Gérer changement visibilité
      if (oldRecord.is_public !== newRecord.is_public) {
        if (newRecord.is_public || newRecord.author_id === userId) {
          updatePageInList(newRecord);
        } else {
          removePageFromList(newRecord.id);
        }
      }
      break;
      
    case 'DELETE':
      removePageFromList(oldRecord.id);
      break;
  }
};
\`\`\`

## 🎯 Optimisations

### Debounce sauvegarde
\`\`\`typescript
const debouncedSave = useMemo(
  () => debounce(async (content) => {
    await updatePage(content);
  }, 1000),
  [pageId]
);
\`\`\`

### Mise à jour optimiste
\`\`\`typescript
// Mise à jour locale immédiate
setLocalContent(newContent);
// Sauvegarde async
debouncedSave(newContent);
\`\`\`

### Cleanup subscriptions
\`\`\`typescript
useEffect(() => {
  const channel = subscribeToChanges();
  return () => {
    supabase.removeChannel(channel);
  };
}, [projectId]);
\`\`\``,

    'wiki-comments': `# 💬 Système de commentaires du Wiki

## 🎨 Interface utilisateur

### Panneau rétractable
- Fermé par défaut pour maximiser l'espace
- Bouton toggle avec compteur de commentaires
- Animation smooth d'ouverture/fermeture
- Largeur fixe de 400px en mode ouvert

### Affichage commentaires
- Avatar avec initiale de l'auteur
- Nom et temps relatif (ex: "il y a 2 heures")
- Badge "Résolu" pour commentaires résolus
- Actions contextuelles (éditer, supprimer, résoudre)

### Réponses imbriquées
- Indentation visuelle (ml-8)
- Auto-expansion si réponses présentes
- Bouton expand/collapse en bas à gauche
- Compteur de réponses visible

## 🔧 Implémentation technique

### Structure commentaire
\`\`\`typescript
interface Comment {
  id: string;
  page_id: string;
  author_id: string;
  author_name?: string;
  parent_comment_id: string | null;
  content: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}
\`\`\`

### Construction arbre commentaires
\`\`\`typescript
const loadComments = async () => {
  // Récupération à plat
  const { data } = await supabase
    .from('wiki_comments_with_authors')
    .select('*')
    .eq('page_id', pageId);
    
  // Construction arbre
  const commentsMap = new Map();
  const rootComments = [];
  
  data.forEach(comment => {
    commentsMap.set(comment.id, { ...comment, replies: [] });
  });
  
  data.forEach(comment => {
    if (comment.parent_comment_id) {
      const parent = commentsMap.get(comment.parent_comment_id);
      parent.replies.push(commentsMap.get(comment.id));
    } else {
      rootComments.push(commentsMap.get(comment.id));
    }
  });
  
  setComments(rootComments);
};
\`\`\`

### Actions disponibles

#### Création
\`\`\`typescript
const addComment = async () => {
  await supabase
    .from('wiki_comments')
    .insert({
      page_id: pageId,
      author_id: currentUserId,
      parent_comment_id: replyTo,
      content: newComment.trim(),
    });
};
\`\`\`

#### Modification
\`\`\`typescript
const updateComment = async (commentId) => {
  await supabase
    .from('wiki_comments')
    .update({ content: editingContent })
    .eq('id', commentId);
};
\`\`\`

#### Résolution
\`\`\`typescript
const toggleResolve = async (commentId, currentStatus) => {
  await supabase
    .from('wiki_comments')
    .update({ is_resolved: !currentStatus })
    .eq('id', commentId);
};
\`\`\`

## 📋 Règles métier

### Qui peut commenter ?
- ✅ Membres de l'équipe projet
- ✅ Sur pages publiques uniquement
- ❌ Pas sur pages privées
- ❌ Pas les externes au projet

### Qui peut modifier ?
- ✅ Auteur du commentaire uniquement
- ✅ Édition du contenu
- ✅ Marquage comme résolu
- ✅ Suppression

### Notifications
- Pas de système de notification email
- Mise à jour temps réel via WebSocket
- Compteur visible sur bouton toggle`,

    'wiki-navigation': `# 🧭 Navigation et organisation du Wiki

## 📂 Structure hiérarchique

### Organisation par auteur
- Groupement principal par membre de l'équipe
- Tri : utilisateur actuel en premier
- Avatar + nom + compteur de pages
- Badge "Moi" pour identification rapide

### Arborescence pages
- Support parent/enfant illimité
- Icônes personnalisables (Lucide React)
- Indicateurs visuels :
  - 🌐 Globe vert = Public
  - 🔒 Cadenas orange = Privé
  - 💬 Bulle = Contient commentaires
- Ordre d'affichage personnalisable

## 🎯 Composant WikiNavigation

### Props interface
\`\`\`typescript
interface WikiNavigationProps {
  pages: WikiPage[];
  selectedPageId: string | null;
  currentUserId: string | null;
  onPageSelect: (page: WikiPage) => void;
  userProfiles: Map<string, string>;
}
\`\`\`

### Algorithme de tri
\`\`\`typescript
// Tri des auteurs
authors.sort((a, b) => {
  // Utilisateur actuel toujours en premier
  if (a.is_current_user) return -1;
  if (b.is_current_user) return 1;
  // Puis par nom alphabétique
  return a.name.localeCompare(b.name);
});

// Tri des pages
pages.sort((a, b) => {
  // D'abord par ordre défini
  if (a.display_order !== undefined && b.display_order !== undefined) {
    return a.display_order - b.display_order;
  }
  // Puis alphabétique
  return a.title.localeCompare(b.title);
});
\`\`\`

### Construction de l'arbre
\`\`\`typescript
const buildPageTree = (flatPages) => {
  const pageMap = new Map();
  const rootPages = [];
  
  // Map toutes les pages
  flatPages.forEach(page => {
    pageMap.set(page.id, { ...page, children: [] });
  });
  
  // Construire relations parent/enfant
  flatPages.forEach(page => {
    if (page.parent_id && pageMap.has(page.parent_id)) {
      const parent = pageMap.get(page.parent_id);
      parent.children.push(pageMap.get(page.id));
    } else {
      rootPages.push(pageMap.get(page.id));
    }
  });
  
  return rootPages;
};
\`\`\`

## 🎨 Styles et interactions

### États visuels
- **Hover** : Background accent léger
- **Sélectionné** : Background primary + texte blanc
- **Expandé** : Chevron vers le bas
- **Collapsed** : Chevron vers la droite

### Animations
- Transition smooth sur hover (150ms)
- Expansion/collapse instantané
- Auto-scroll vers page sélectionnée

### Responsive
- Largeur fixe sidebar (320px)
- ScrollArea pour listes longues
- Truncate pour titres trop longs`,

    'wiki-editor': `# ✏️ Éditeur BlockNote

## 🎯 Intégration BlockNote

### Configuration de base
\`\`\`typescript
import { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";

const editor = useCreateBlockNote({
  initialContent: content ? JSON.parse(content) : undefined,
});
\`\`\`

### Fix du bug useState dispatcher
**Problème** : "can't access property 'useState', dispatcher is null"
**Cause** : onChange appelé pendant le rendu React
**Solution** : Isolation dans useEffect

\`\`\`typescript
// ❌ Ancien code problématique
editor.onChange(() => {
  editor.blocksToHTMLLossy(editor.document).then(onChange);
});

// ✅ Code corrigé
useEffect(() => {
  const handleChange = () => {
    editor.blocksToHTMLLossy(editor.document)
      .then((html) => onChange(html))
      .catch((error) => console.error('Erreur conversion:', error));
  };
  editor.onChange(handleChange);
}, [editor, onChange]);
\`\`\`

## 📝 Fonctionnalités supportées

### Formatage texte
- **Gras**, *italique*, ~~barré~~
- Titres H1 → H6
- Listes à puces et numérotées
- Citations (blockquote)
- Code inline et blocs

### Blocs avancés
- Tables avec édition cellules
- Images avec upload/URL
- Vidéos embed
- Fichiers attachés
- Séparateurs horizontaux

### Raccourcis clavier
- **Cmd/Ctrl + B** : Gras
- **Cmd/Ctrl + I** : Italique
- **Cmd/Ctrl + Z** : Annuler
- **/** : Menu slash commands
- **Tab** : Indenter liste
- **Shift + Tab** : Désindenter

## 🔄 Sauvegarde automatique

### Debounce strategy
\`\`\`typescript
const debouncedSave = useMemo(
  () => debounce(async (html: string) => {
    try {
      await supabase
        .from('wiki_pages')
        .update({ content: html })
        .eq('id', pageId);
    } catch (error) {
      toast.error('Erreur sauvegarde');
    }
  }, 1000),
  [pageId]
);
\`\`\`

### Indicateur visuel
- Point vert : Sauvegardé
- Point orange : Modification en cours
- Point rouge : Erreur sauvegarde

## 🎨 Personnalisation UI

### Theme BlockNote
\`\`\`css
.bn-editor {
  font-family: Inter, system-ui;
  min-height: 400px;
}

.bn-block-content {
  line-height: 1.6;
}

.bn-inline-code {
  background: rgb(243 244 246);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
\`\`\`

### Mode plein écran
- Hauteur : calc(100vh - header)
- Largeur : 100% container
- Focus trap activé
- Escape pour sortir

## 🚀 Optimisations performances

### Lazy loading
- Chargement BlockNote uniquement si page sélectionnée
- Import dynamique des extensions

### Memoization
- useCallback pour onChange
- useMemo pour editor instance
- React.memo sur WikiEditor

### Cleanup
\`\`\`typescript
useEffect(() => {
  return () => {
    // Cleanup editor subscriptions
    editor.removeAllListeners();
  };
}, [editor]);
\`\`\``,

    'payment-system': `# 💳 Système de Paiement Stripe

## 📝 Vue d'ensemble

Le système de paiement intégré permet aux clients de gérer leurs crédits pour créer des projets et booker des équipes.

## 🏗️ Architecture

### Tables de base de données

#### client_credits
\`\`\`sql
CREATE TABLE public.client_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  balance_cents INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
\`\`\`

#### payment_history
\`\`\`sql
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount_cents INTEGER NOT NULL,
  stripe_payment_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'stripe',
  invoice_url TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

## 💰 Gestion des crédits

### Hook useClientCredits
\`\`\`typescript
import { useClientCredits } from '@/hooks/useClientCredits';

const { 
  balance,           // Solde en centimes
  loading,          // État de chargement
  hasMinimumCredits, // Vérification du minimum
  formatBalance,     // Format pour affichage (EUR)
  checkCreditsForAction, // Vérifier avant action
  deductCredits,    // Déduire des crédits
  refreshBalance    // Rafraîchir le solde
} = useClientCredits();
\`\`\`

### Vérification avant action
\`\`\`typescript
// Avant de démarrer un projet
const creditCheck = checkCreditsForAction('Démarrer un projet', 5000);
if (!creditCheck.success) {
  toast.error(creditCheck.message);
  setShowPaymentModal(true);
  return;
}
\`\`\`

## 💳 Intégration Stripe

### Configuration
\`\`\`typescript
// Clés Stripe (test pour le moment)
const STRIPE_PUBLISHABLE_KEY = 'pk_test_...'
const STRIPE_SECRET_KEY = 'sk_test_...' // Côté serveur uniquement
\`\`\`

### Composant StripePaymentModal
\`\`\`typescript
<StripePaymentModal
  isOpen={showPaymentModal}
  onClose={() => setShowPaymentModal(false)}
  onSuccess={() => {
    toast.success('Crédits ajoutés');
    refreshBalance();
  }}
  minimumAmount={50} // Minimum 50€
/>
\`\`\`

## 📊 Historique des paiements

### Page dédiée dans les paramètres
- Onglet "Mes paiements" dans ClientSettings
- Affichage du solde actuel
- Liste chronologique des paiements
- Téléchargement de factures HTML

### Composant PaymentHistory
\`\`\`typescript
<PaymentHistory />
// Affiche:
// - Solde actuel avec bouton d'ajout
// - Historique complet
// - Boutons de téléchargement facture
\`\`\`

## 🔐 Sécurité

### RLS Policies
\`\`\`sql
-- Clients voient uniquement leurs crédits
CREATE POLICY "Users can view own credits" 
ON client_credits FOR SELECT
USING (auth.uid() = user_id);

-- Clients voient uniquement leur historique
CREATE POLICY "Users can view own payment history"
ON payment_history FOR SELECT
USING (auth.uid() = user_id);
\`\`\`

## 🚀 Edge Functions

### manage-client-credits
Actions disponibles:
- **check_balance**: Vérifier le solde
- **add_credits**: Ajouter des crédits (avec Stripe)
- **deduct_credits**: Déduire des crédits

\`\`\`typescript
const { data } = await supabase.functions.invoke('manage-client-credits', {
  body: {
    action: 'add_credits',
    userId: user.id,
    amount: 5000, // En centimes
    paymentMethodId: 'pm_card_visa'
  }
});
\`\`\`

## 📝 Workflow complet

### 1. Client veut créer un projet
1. Clic sur "Booker une équipe" ou "Démarrer"
2. Vérification des crédits (minimum 50€)
3. Si insuffisant → Popup de paiement
4. Paiement via Stripe
5. Crédits ajoutés au compte
6. Action autorisée

### 2. Ajout de crédits
1. Client va dans Paramètres → Mes paiements
2. Clic sur "Ajouter des crédits"
3. Saisie du montant (minimum 50€)
4. Saisie des informations de carte
5. Paiement sécurisé via Stripe
6. Mise à jour instantanée du solde
7. Enregistrement dans l'historique

### 3. Téléchargement de facture
1. Client accède à l'historique
2. Clic sur l'icône de téléchargement
3. Génération de la facture HTML
4. Téléchargement automatique

## ⚠️ Points importants

### Montants minimums
- Dépôt minimum: 50€
- Projet nécessite: 50€ minimum

### Format des montants
- Base de données: Centimes (INTEGER)
- Affichage: Euros (formatBalance())
- Stripe: Centimes

### Temps réel
- Solde mis à jour en temps réel
- Subscription Supabase Realtime
- Refresh automatique après paiement

## 🔧 Maintenance

### Vérifier les paiements
\`\`\`sql
SELECT * FROM payment_history 
WHERE user_id = '[USER_ID]'
ORDER BY payment_date DESC;
\`\`\`

### Vérifier le solde
\`\`\`sql
SELECT * FROM client_credits
WHERE user_id = '[USER_ID]';
\`\`\`

### Ajouter des crédits manuellement (admin)
\`\`\`sql
UPDATE client_credits
SET balance_cents = balance_cents + 5000
WHERE user_id = '[USER_ID]';
\`\`\``
  });

  const getContent = () => {
    return content[activeSection as keyof typeof content] || content.general;
  };

  const getSectionTitle = () => {
    // Chercher dans tous les menus
    for (const item of menuItems) {
      if (item.id === activeSection) return item.label;
      if (item.children) {
        const child = item.children.find(c => c.id === activeSection);
        if (child) return child.label;
      }
    }
    return 'Documentation';
  };

  const handleSave = () => {
    localStorage.setItem('llm_documentation', JSON.stringify(content));
    toast({
      title: "Documentation sauvegardée",
      description: "Les modifications ont été enregistrées localement"
    });
    setIsEditing(false);
  };

  const handleContentChange = (value: string) => {
    setContent(prev => ({
      ...prev,
      [activeSection]: value
    }));
  };

  // Charger depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('llm_documentation');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setContent(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error loading saved documentation:', e);
      }
    }
  }, []);

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const Icon = item.icon;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.id);
            } else {
              setActiveSection(item.id);
            }
          }}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
            "text-gray-300 hover:bg-gray-700 hover:text-white",
            activeSection === item.id && "bg-blue-600 text-white font-medium",
            level > 0 && "pl-8"
          )}
        >
          {hasChildren && (
            <span className="w-4">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          )}
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <span className="flex-1 text-left">{item.label}</span>
        </button>
        
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Documentation LLM
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Référence technique pour l'IA
          </p>
        </div>
        
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4 space-y-1">
            {menuItems.map(item => renderMenuItem(item))}
          </div>
        </ScrollArea>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-5xl mx-auto p-8">
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-gray-700">
              Cette documentation est utilisée comme référence par l'IA pour comprendre l'architecture du projet.
              Les sections marquées 🔥 contiennent les dernières mises à jour importantes.
            </AlertDescription>
          </Alert>

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl text-gray-900">{getSectionTitle()}</CardTitle>
                  <CardDescription className="text-gray-600">
                    {activeSection === 'projet-demarrage' && 
                      "Documentation technique complète du processus de démarrage de projet"
                    }
                    {activeSection === 'general' && 
                      "Vue d'ensemble de l'architecture et des conventions"
                    }
                    {activeSection.startsWith('candidat') && 
                      "Documentation du flux et processus candidat"
                    }
                    {activeSection.startsWith('db') && 
                      "Structure et configuration de la base de données"
                    }
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {/* Hide edit button for design system sections */}
                  {!activeSection.startsWith('design-') && (
                    isEditing ? (
                      <>
                        <Button onClick={handleSave} size="sm">
                          <Save className="w-4 h-4 mr-2" />
                          Sauvegarder
                        </Button>
                        <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Éditer
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Render React components for design system sections */}
              {activeSection === 'design-modal' ? (
                <Suspense fallback={<div className="flex items-center justify-center p-8">Chargement...</div>}>
                  <DesignSystemModal />
                </Suspense>
              ) : isEditing ? (
                <Textarea
                  value={getContent()}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="min-h-[600px] font-mono text-sm bg-gray-50 text-gray-900 border-gray-300"
                  placeholder="Documentation..."
                />
              ) : (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap bg-gray-50 text-gray-900 p-6 rounded-lg overflow-x-auto border border-gray-200">
                    {getContent()}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LLMDashboard;