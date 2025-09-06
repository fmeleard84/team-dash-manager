import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  FolderOpen, Users, Globe, Code, FileText, Book,
  Briefcase, Languages, Lightbulb, Layout
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts?: {
    categories: number;
    profiles: number;
    languages: number;
    expertises: number;
    templates: number;
  };
}

const menuItems = [
  { 
    id: 'categories', 
    label: 'Catégories HR', 
    icon: FolderOpen,
    description: 'Gérer les catégories de ressources'
  },
  { 
    id: 'profiles', 
    label: 'Profils', 
    icon: Users,
    description: 'Configurer les profils métiers'
  },
  { 
    id: 'languages', 
    label: 'Langues', 
    icon: Languages,
    description: 'Définir les langues et leurs coûts'
  },
  { 
    id: 'expertises', 
    label: 'Expertises', 
    icon: Lightbulb,
    description: 'Gérer les expertises techniques'
  },
  { 
    id: 'templates', 
    label: 'Templates', 
    icon: Layout,
    description: 'Créer des templates de projets'
  },
];

export function AdminSidebar({ activeTab, onTabChange, counts }: AdminSidebarProps) {
  const location = useLocation();

  return (
    <aside className="w-72 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Administration</h2>
        <p className="text-sm text-gray-500 mt-1">Gestion des ressources</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const count = counts?.[item.id as keyof typeof counts];
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-all",
                "hover:bg-gray-50 text-left group",
                isActive && "bg-purple-50 hover:bg-purple-50"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 mt-0.5 transition-colors",
                isActive ? "text-purple-600" : "text-gray-400 group-hover:text-gray-600"
              )} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "font-medium transition-colors",
                    isActive ? "text-purple-900" : "text-gray-900"
                  )}>
                    {item.label}
                  </span>
                  {count !== undefined && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full transition-colors",
                      isActive 
                        ? "bg-purple-200 text-purple-700" 
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {count}
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-xs mt-0.5 transition-colors",
                  isActive ? "text-purple-600" : "text-gray-500"
                )}>
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}

        {/* Divider */}
        <div className="my-4 border-t border-gray-200" />

        {/* Link to LLM Documentation */}
        <Link
          to="/llm"
          className={cn(
            "w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-all",
            "hover:bg-blue-50 text-left group"
          )}
        >
          <Book className="w-5 h-5 mt-0.5 text-blue-500 group-hover:text-blue-600" />
          <div className="flex-1">
            <span className="font-medium text-gray-900">
              Documentation LLM
            </span>
            <p className="text-xs mt-0.5 text-gray-500">
              Consulter la documentation technique
            </p>
          </div>
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="px-4 py-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Conseil :</span> Utilisez la documentation LLM pour comprendre l'architecture du système.
          </p>
        </div>
      </div>
    </aside>
  );
}