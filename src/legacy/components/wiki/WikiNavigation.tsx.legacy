import React, { useState } from 'react';
import { 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  User,
  FolderOpen,
  MessageCircle,
  Lock,
  Globe
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WikiPage {
  id: string;
  title: string;
  is_public: boolean;
  author_id: string;
  parent_id: string | null;
  display_order?: number;
  has_comments?: boolean;
  children?: WikiPage[];
}

interface Author {
  id: string;
  name: string;
  email?: string;
  is_current_user: boolean;
  pages: WikiPage[];
}

interface WikiNavigationProps {
  pages: WikiPage[];
  selectedPageId: string | null;
  currentUserId: string | null;
  onPageSelect: (page: WikiPage) => void;
  userProfiles: Map<string, string>;
}

export default function WikiNavigation({
  pages,
  selectedPageId,
  currentUserId,
  onPageSelect,
  userProfiles
}: WikiNavigationProps) {
  const [expandedAuthors, setExpandedAuthors] = useState<Set<string>>(new Set());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  // Grouper les pages par auteur
  const groupPagesByAuthor = (): Author[] => {
    const authorsMap = new Map<string, Author>();

    pages.forEach(page => {
      const authorId = page.author_id;
      const authorName = userProfiles.get(authorId) || 'Utilisateur';
      
      if (!authorsMap.has(authorId)) {
        authorsMap.set(authorId, {
          id: authorId,
          name: authorName,
          is_current_user: authorId === currentUserId,
          pages: []
        });
      }
      
      authorsMap.get(authorId)!.pages.push(page);
    });

    // Trier : utilisateur actuel en premier, puis par nom
    const authorsArray = Array.from(authorsMap.values());
    return authorsArray.sort((a, b) => {
      if (a.is_current_user && !b.is_current_user) return -1;
      if (!a.is_current_user && b.is_current_user) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const toggleAuthor = (authorId: string) => {
    const newExpanded = new Set(expandedAuthors);
    if (newExpanded.has(authorId)) {
      newExpanded.delete(authorId);
    } else {
      newExpanded.add(authorId);
    }
    setExpandedAuthors(newExpanded);
  };

  const togglePage = (pageId: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  const renderPageTree = (pages: WikiPage[], level = 0) => {
    // Trier les pages par ordre d'affichage et titre
    const sortedPages = [...pages].sort((a, b) => {
      if (a.display_order !== undefined && b.display_order !== undefined) {
        return a.display_order - b.display_order;
      }
      return a.title.localeCompare(b.title);
    });

    return sortedPages.map(page => {
      const hasChildren = page.children && page.children.length > 0;
      const isExpanded = expandedPages.has(page.id);
      const isSelected = selectedPageId === page.id;
      const isOwner = page.author_id === currentUserId;

      return (
        <div key={page.id}>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all",
              isSelected 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-accent",
              level > 0 && "ml-4"
            )}
            onClick={() => onPageSelect(page)}
          >
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePage(page.id);
                }}
                className="p-0.5 hover:bg-accent-foreground/10 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
            
            <FileText className="h-3.5 w-3.5 shrink-0" />
            
            <span className="flex-1 text-sm truncate">{page.title}</span>
            
            <div className="flex items-center gap-1 shrink-0">
              {page.has_comments && (
                <MessageCircle className="h-3 w-3 opacity-60" />
              )}
              {page.is_public ? (
                <Globe className="h-3 w-3 text-green-600" title="Public" />
              ) : (
                <Lock className="h-3 w-3 text-orange-600" title="Privé" />
              )}
            </div>
          </div>
          
          {hasChildren && isExpanded && (
            <div className="mt-0.5">
              {renderPageTree(page.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const buildPageTree = (flatPages: WikiPage[]): WikiPage[] => {
    const pageMap = new Map<string, WikiPage>();
    const rootPages: WikiPage[] = [];

    // Créer une map de toutes les pages
    flatPages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [] });
    });

    // Construire l'arbre
    flatPages.forEach(page => {
      const pageNode = pageMap.get(page.id)!;
      if (page.parent_id && pageMap.has(page.parent_id)) {
        const parent = pageMap.get(page.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(pageNode);
      } else {
        rootPages.push(pageNode);
      }
    });

    return rootPages;
  };

  const authors = groupPagesByAuthor();

  // Auto-expand current user
  React.useEffect(() => {
    const currentAuthor = authors.find(a => a.is_current_user);
    if (currentAuthor && !expandedAuthors.has(currentAuthor.id)) {
      setExpandedAuthors(new Set([currentAuthor.id]));
    }
  }, []);

  return (
    <div className="space-y-3">
      {authors.map(author => {
        const isExpanded = expandedAuthors.has(author.id);
        const authorPages = buildPageTree(author.pages);

        return (
          <div key={author.id} className="space-y-1">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                "hover:bg-accent/50"
              )}
              onClick={() => toggleAuthor(author.id)}
            >
              <button className="p-0.5">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary/10">
                  {author.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm font-medium">{author.name}</span>
                {author.is_current_user && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    Moi
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  ({author.pages.length})
                </span>
              </div>
            </div>
            
            {isExpanded && (
              <div className="ml-2 space-y-0.5">
                {renderPageTree(authorPages)}
              </div>
            )}
          </div>
        );
      })}
      
      {authors.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune page dans le wiki</p>
        </div>
      )}
    </div>
  );
}