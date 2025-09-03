import { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, FileText, Users, FolderOpen, GitBranch, Database, AlertCircle, ChevronRight, ChevronDown, Home, Play, Calendar, MessageSquare, Layout, Code, Shield, Server, Zap } from 'lucide-react';
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
      id: 'api',
      label: 'API & Intégrations',
      icon: Code,
      children: [
        { id: 'api-supabase', label: 'Supabase' },
        { id: 'api-hooks', label: 'React Hooks' },
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
    general: `# Documentation Technique - Team Dash Manager

## Vue d'ensemble
Team Dash Manager est une plateforme de gestion de projets et de ressources humaines permettant de connecter des clients avec des candidats qualifiés pour former des équipes projet.

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

## Points d'attention
- Les candidats doivent être qualifiés avant de pouvoir recevoir des missions
- Un projet doit avoir toutes ses ressources acceptées avant de pouvoir démarrer
- Le statut 'play' active les outils collaboratifs pour l'équipe
- L'invitation kickoff doit apparaître dans le planning des candidats
- La messagerie utilise **EnhancedMessageSystem** pour TOUS les utilisateurs (unifié 30/08/2024)
- Les politiques RLS storage acceptent booking_status IN ('accepted', 'booké') (corrigé 31/08/2024)

## Conventions de code
- Utiliser des hooks personnalisés pour la logique métier réutilisable
- Préfixer les composants partagés avec 'Shared'
- Utiliser le real-time Supabase pour les mises à jour instantanées
- Toujours filtrer les données côté serveur (RLS)`,

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
- Le matching se fait sur : profile_id, seniority, compétences
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

## 🆕 Corrections Importantes (02/09/2025)

### Problème Edge Function corrigé
- **Erreur**: Join invalide hr_profiles:profile_id causant erreur 500
- **Solution**: Suppression du join, récupération séparée du nom du profil
- **Fichier**: resource-booking/mission-management-fixed.ts

### Statuts projet corrigés
- **Erreur**: Contrainte DB n'acceptait pas 'attente-team'
- **Valeurs valides**: 'play', 'pause', 'completed', 'archivé'
- **Logique**: Quand toutes ressources acceptées → status = 'play'

### Filtrage candidat amélioré
- **Ajout**: Filtre booking_status='recherche' dans CandidateDashboard
- **Résultat**: Candidats ne voient que missions disponibles

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

#### Étape 1: Récupération équipe
\`\`\`sql
SELECT * FROM project_teams 
WHERE project_id = projectId
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
1. Vérification des prérequis
2. Récupération des ressources acceptées
3. Création du Kanban avec colonnes standards
4. Initialisation du storage
5. Notifications à l'équipe
6. Mise à jour du statut projet

### Tables modifiées
- kanban_boards, kanban_columns, kanban_cards
- project_teams (NOUVEAU)
- candidate_notifications
- projects (status)

### Gestion d'erreurs
- Rollback partiel non supporté
- Log détaillé pour debug
- Ne bloque pas sur erreurs non critiques`,

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

    'projet-planning': `# Planning & Événements

## Système d'événements

### Tables principales
- project_events: Événements du projet
- project_event_attendees: Participants
- candidate_event_notifications: Invitations candidats

### Création d'événement
1. Client crée via l'interface Planning
2. Sélectionne participants (équipe)
3. Envoie invitations par email
4. Crée notifications pour candidats

### Invitation Kickoff
- Créée automatiquement au démarrage
- Tous les membres invités
- Lien visio inclus
- Visible dans planning candidat

### Synchronisation
- Real-time updates via Supabase
- Export Google Calendar possible
- Rappels par email`,

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

### Composant principal
\`\`\`typescript
SharedDriveView
- Localisation: src/components/shared/SharedDriveView.tsx
- Utilisé par: ClientDashboard et CandidateDashboard
- Type: Composant unifié pour tous les utilisateurs
\`\`\`

### Structure de stockage

⚠️ **Important** : Le chemin utilise "projects/" (avec un 's') et non "project/"

\`\`\`
project-files/ (bucket Supabase Storage)
└── projects/                # Notez le 's' dans projects
    └── {project_id}/
        ├── shared/          # Fichiers partagés avec toute l'équipe
        ├── client/          # Fichiers du client
        ├── candidates/      # Fichiers des candidats
        └── deliverables/    # Livrables du projet
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

## Flux d'utilisation

### 1. Initialisation
Lors du démarrage du projet (status → 'play') :
- Création automatique de la structure de dossiers
- Configuration des permissions initiales
- Notification aux membres de l'équipe

### 2. Upload de fichiers
\`\`\`typescript
// Frontend: SharedDriveView.tsx
const uploadFiles = async (files: File[]) => {
  // 1. Détermine le chemin selon userType
  const prefix = userType === 'client' 
    ? \`projects/\${projectId}/client/\`
    : \`projects/\${projectId}/candidates/\`;
  
  // 2. Upload via Supabase Storage
  const { data, error } = await supabase.storage
    .from('project-files')
    .upload(\`\${prefix}\${file.name}\`, file);
  
  // 3. RLS vérifie automatiquement les permissions
};
\`\`\`

### 3. Navigation et téléchargement
- Interface type explorateur de fichiers
- Breadcrumb pour la navigation
- Actions: télécharger, renommer, supprimer
- Prévisualisation pour images et PDF

## Fonctionnalités

### Pour les clients
- ✅ Upload illimité dans leur projet
- ✅ Création de dossiers
- ✅ Gestion complète des fichiers
- ✅ Partage de liens temporaires
- ✅ Export en ZIP

### Pour les candidats
- ✅ Upload dans dossiers autorisés
- ✅ Téléchargement de tous les fichiers projet
- ✅ Création de sous-dossiers dans candidates/
- ✅ Suppression de leurs propres fichiers

### Limitations
- Taille max par fichier: 50MB
- Types autorisés: documents, images, archives
- Quota par projet: 5GB (configurable)

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
- Optimistic updates quand possible`
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
  useState(() => {
    const saved = localStorage.getItem('llm_documentation');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setContent(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error loading saved documentation:', e);
      }
    }
  });

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
            "hover:bg-gray-100",
            activeSection === item.id && "bg-blue-50 text-blue-700 font-medium",
            level > 0 && "pl-8"
          )}
        >
          {hasChildren && (
            <span className="w-4">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          )}
          {Icon && <Icon className="w-4 h-4" />}
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Documentation LLM
          </h1>
          <p className="text-sm text-gray-600 mt-2">
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
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cette documentation est utilisée comme référence par l'IA pour comprendre l'architecture du projet.
              Les sections marquées 🔥 contiennent les dernières mises à jour importantes.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">{getSectionTitle()}</CardTitle>
                  <CardDescription>
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
                  className="min-h-[600px] font-mono text-sm"
                  placeholder="Documentation..."
                />
              ) : (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap bg-gray-50 p-6 rounded-lg overflow-x-auto">
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