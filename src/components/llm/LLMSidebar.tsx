import { ChevronRight, ChevronDown, Home, Users, FolderOpen, Database, AlertCircle, BookOpen, Code, CreditCard, Layout, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface MenuItem {
  id: string;
  label: string;
  icon?: any;
  children?: MenuItem[];
}

interface LLMSidebarProps {
  activeSection: string;
  expandedSections: Set<string>;
  onSectionChange: (sectionId: string) => void;
  onToggleSection: (sectionId: string) => void;
}

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

const LLMSidebar: React.FC<LLMSidebarProps> = ({
  activeSection,
  expandedSections,
  onSectionChange,
  onToggleSection
}) => {
  const renderMenuItem = (item: MenuItem, level: number = 0): JSX.Element => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const Icon = item.icon;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              onToggleSection(item.id);
            } else {
              onSectionChange(item.id);
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
  );
};

export default LLMSidebar;