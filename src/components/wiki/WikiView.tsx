import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import WikiEditor from './WikiEditor';
import WikiComments from './WikiComments';
import WikiNavigation from './WikiNavigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  Save,
  X,
  Clock,
  User,
  ChevronRight,
  Home,
  BookOpen,
  Copy,
  Share2,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  MessageCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WikiViewProps {
  projectId: string;
  userType: 'client' | 'candidate';
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

interface WikiPage {
  id: string;
  project_id: string;
  title: string;
  content: string;
  parent_id: string | null;
  author_id: string;
  author_name?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  last_edited_by?: string;
  last_editor_name?: string;
  version: number;
  children?: WikiPage[];
}

export default function WikiView({ projectId, userType, onFullscreenChange }: WikiViewProps) {
  const { toast } = useToast();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [showNewPageDialog, setShowNewPageDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageParentId, setNewPageParentId] = useState<string | null>(null);
  const [newPageIsPublic, setNewPageIsPublic] = useState(true);
  const [currentPath, setCurrentPath] = useState<WikiPage[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, string>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState<Map<string, number>>(new Map());

  const buildBreadcrumb = useCallback((page: WikiPage) => {
    const path: WikiPage[] = [];
    let current: WikiPage | undefined = page;
    
    // Fonction récursive pour trouver dans l'arbre
    const findInTree = (pages: WikiPage[], id: string): WikiPage | undefined => {
      for (const p of pages) {
        if (p.id === id) return p;
        if (p.children) {
          const found = findInTree(p.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    
    while (current) {
      path.unshift(current);
      if (current.parent_id) {
        current = findInTree(pages, current.parent_id);
      } else {
        break;
      }
    }
    
    setCurrentPath(path);
  }, [pages]);

  useEffect(() => {
    if (projectId) {
      loadPages();
      getCurrentUser();
    }
  }, [projectId]);
  
  // Set up realtime subscription with improved handling
  useEffect(() => {
    if (!projectId || !currentUserId) return;
    
    const channel = supabase
      .channel(`wiki-pages-${projectId}-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wiki_pages',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          console.log('Wiki realtime event:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Nouvelle page ajoutée
            await loadPages();
            
            // Notification seulement si ce n'est pas nous qui avons créé la page
            if (payload.new && payload.new.author_id !== currentUserId) {
              toast({
                title: "Nouvelle page ajoutée",
                description: `"${payload.new.title}" a été ajoutée au wiki`,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const newPage = payload.new as WikiPage;
            const oldPage = payload.old as WikiPage;
            
            // Si la visibilité a changé
            if (oldPage.is_public !== newPage.is_public) {
              await loadPages();
              
              // Notification pour les changements de visibilité
              if (newPage.last_edited_by !== currentUserId) {
                if (newPage.is_public) {
                  toast({
                    title: "Page rendue publique",
                    description: `"${newPage.title}" est maintenant visible par l'équipe`,
                  });
                } else if (oldPage.is_public && !newPage.is_public && newPage.author_id !== currentUserId) {
                  // La page est devenue privée et n'est plus visible pour nous
                  if (selectedPage?.id === newPage.id) {
                    setSelectedPage(null);
                  }
                  toast({
                    title: "Page rendue privée",
                    description: `"${newPage.title}" n'est plus accessible`,
                    variant: "destructive",
                  });
                }
              }
            }
            // Si le titre a changé
            else if (oldPage.title !== newPage.title) {
              await loadPages();
              
              if (newPage.last_edited_by !== currentUserId) {
                toast({
                  title: "Page renommée",
                  description: `"${oldPage.title}" a été renommée en "${newPage.title}"`,
                });
              }
              
              // Mettre à jour la page sélectionnée si c'est la même
              if (selectedPage?.id === newPage.id) {
                setSelectedPage(prev => prev ? { ...prev, title: newPage.title } : null);
                setEditingTitle(newPage.title);
              }
            }
            // Si le contenu a changé
            else if (newPage.last_edited_by !== currentUserId) {
              await loadPages();
              
              // Mettre à jour si c'est la page courante
              if (selectedPage?.id === newPage.id) {
                toast({
                  title: "Page mise à jour",
                  description: "Cette page a été modifiée par un autre membre",
                });
                // Optionnel : recharger le contenu
                setEditingContent(newPage.content);
                setSelectedPage(prev => prev ? { ...prev, ...newPage } : null);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            await loadPages();
            
            // Si la page supprimée est celle sélectionnée
            if (selectedPage && payload.old && payload.old.id === selectedPage.id) {
              setSelectedPage(null);
              toast({
                title: "Page supprimée",
                description: "Cette page a été supprimée",
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, currentUserId]);

  useEffect(() => {
    if (selectedPage) {
      buildBreadcrumb(selectedPage);
      // Activer automatiquement le mode édition
      setIsEditing(true);
      setEditingContent(selectedPage.content || '');
      setEditingTitle(selectedPage.title || '');
      setIsRenamingTitle(false); // Réinitialiser le mode renommage
    }
  }, [selectedPage, buildBreadcrumb]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadPages = async () => {
    if (!projectId) return;
    
    // Get current user if not already set
    if (!currentUserId) {
      await getCurrentUser();
    }
    
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      // Force refresh with timestamp to bypass cache
      const { data: pagesData, error } = await supabase
        .from('wiki_pages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1000); // Add limit to ensure fresh data

      if (error) throw error;
      
      // Filter pages based on visibility
      const visiblePages = (pagesData || []).filter(page => {
        // Page is visible if:
        // 1. It's public (is_public = true)
        // 2. OR the current user is the author (même si privée)
        return page.is_public || page.author_id === userId;
      });

      // Récupérer les noms des auteurs et éditeurs
      const uniqueUserIds = new Set<string>();
      pagesData?.forEach(page => {
        if (page.author_id) uniqueUserIds.add(page.author_id);
        if (page.last_edited_by) uniqueUserIds.add(page.last_edited_by);
      });

      // Récupérer tous les profils en une seule requête
      const profilesMap = new Map<string, string>();
      if (uniqueUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', Array.from(uniqueUserIds));
        
        profiles?.forEach(profile => {
          const fullName = [profile.first_name, profile.last_name]
            .filter(Boolean)
            .join(' ') || 'Utilisateur';
          profilesMap.set(profile.id, fullName);
        });
        setUserProfiles(profilesMap);
      }

      // Associer les noms aux pages
      const pagesWithNames = visiblePages.map(page => ({
        ...page,
        author_name: profilesMap.get(page.author_id) || 'Utilisateur',
        last_editor_name: page.last_edited_by 
          ? profilesMap.get(page.last_edited_by) || profilesMap.get(page.author_id) || 'Utilisateur'
          : profilesMap.get(page.author_id) || 'Utilisateur',
      }));

      // Organiser les pages en arbre
      const pagesTree = buildPagesTree(pagesWithNames);
      setPages(pagesTree);

      // Si aucune page sélectionnée, sélectionner la première
      if (!selectedPage && pagesTree.length > 0) {
        setSelectedPage(pagesTree[0]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des pages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les pages du wiki",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildPagesTree = (flatPages: WikiPage[]): WikiPage[] => {
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

  const createPage = async () => {
    if (!newPageTitle.trim() || !projectId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('wiki_pages')
        .insert({
          project_id: projectId,
          title: newPageTitle.trim(),
          content: `<h1>${newPageTitle.trim()}</h1><p>Commencez à écrire votre contenu ici...</p>`,
          parent_id: newPageParentId,
          author_id: user.id,
          is_public: newPageIsPublic,
          version: 1,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Page créée",
        description: "La nouvelle page a été créée avec succès",
      });

      setShowNewPageDialog(false);
      setNewPageTitle('');
      setNewPageParentId(null);
      setNewPageIsPublic(true);
      loadPages();
      setSelectedPage(data);
    } catch (error) {
      console.error('Erreur lors de la création de la page:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la page",
        variant: "destructive",
      });
    }
  };

  const savePage = async () => {
    if (!selectedPage || !editingTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { error } = await supabase
        .from('wiki_pages')
        .update({
          title: editingTitle.trim(),
          content: editingContent,
          last_edited_by: user.id,
          updated_at: new Date().toISOString(),
          version: selectedPage.version + 1,
        })
        .eq('id', selectedPage.id);

      if (error) throw error;

      toast({
        title: "Page sauvegardée",
        description: "Les modifications ont été enregistrées",
      });

      // Mettre à jour la page sélectionnée avec les nouvelles données
      setSelectedPage({
        ...selectedPage,
        title: editingTitle.trim(),
        content: editingContent,
        last_edited_by: user.id,
        updated_at: new Date().toISOString(),
        version: selectedPage.version + 1,
        last_editor_name: userProfiles.get(user.id) || 'Vous',
      });

      setIsEditing(false);
      loadPages();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
    }
  };

  const deletePage = async (pageId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette page et toutes ses sous-pages ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('wiki_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      toast({
        title: "Page supprimée",
        description: "La page a été supprimée avec succès",
      });

      if (selectedPage?.id === pageId) {
        setSelectedPage(null);
      }
      loadPages();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la page",
        variant: "destructive",
      });
    }
  };

  const togglePublic = async (page: WikiPage) => {
    // Only allow the author or the client to change visibility
    if (page.author_id !== currentUserId && userType !== 'client') {
      toast({
        title: "Action non autorisée",
        description: "Seul l'auteur de la page peut modifier sa visibilité",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const newIsPublic = !page.is_public;
      const { error } = await supabase
        .from('wiki_pages')
        .update({ is_public: newIsPublic })
        .eq('id', page.id);

      if (error) throw error;

      toast({
        title: newIsPublic ? "Page rendue publique" : "Page rendue privée",
        description: newIsPublic 
          ? "Cette page est maintenant visible par tous les membres du projet" 
          : "Cette page n'est visible que par vous",
      });

      // Update the selected page if it's the current one
      if (selectedPage?.id === page.id) {
        setSelectedPage({ ...selectedPage, is_public: newIsPublic });
      }
      
      loadPages();
    } catch (error) {
      console.error('Erreur lors du changement de visibilité:', error);
      toast({
        title: "Erreur",
        description: "Impossible de changer la visibilité",
        variant: "destructive",
      });
    }
  };

  const copyPageLink = (page: WikiPage) => {
    const url = `${window.location.origin}/wiki/${projectId}/${page.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Lien copié",
      description: "Le lien de la page a été copié dans le presse-papier",
    });
  };



  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => (
    <div className={`h-full flex transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Sidebar avec liste des pages */}
      <div className={`border-r bg-background flex flex-col transition-all duration-300 ${isFullscreen ? 'w-64' : 'w-80'} ${isFullscreen ? 'md:w-72' : ''}`}>
        <div className={`p-4 border-b ${isFullscreen ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5" />
            <h2 className="font-semibold">Wiki du Projet</h2>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <Button
            onClick={() => setShowNewPageDialog(true)}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Page
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center text-muted-foreground">Chargement...</div>
          ) : (
            <WikiNavigation
              pages={filteredPages}
              selectedPageId={selectedPage?.id || null}
              currentUserId={currentUserId}
              onPageSelect={setSelectedPage}
              userProfiles={userProfiles}
            />
          )}
        </div>
      </div>

      {/* Zone de contenu principale */}
      <div className="flex-1 flex flex-col">
        {selectedPage ? (
          <>
            {/* Header avec breadcrumb et actions */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="h-4 w-4" />
                  {currentPath.map((page, index) => (
                    <React.Fragment key={page.id}>
                      {index > 0 && <ChevronRight className="h-4 w-4" />}
                      <button
                        onClick={() => setSelectedPage(page)}
                        className="hover:text-foreground transition-colors"
                      >
                        {page.title}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Bouton pour afficher/masquer les commentaires */}
                  {selectedPage.is_public && (
                    <Button
                      onClick={() => setShowComments(!showComments)}
                      variant={showComments ? "default" : "ghost"}
                      size="sm"
                      className="relative"
                      title={showComments ? "Masquer les commentaires" : "Afficher les commentaires"}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {commentsCount.get(selectedPage.id) ? (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                          {commentsCount.get(selectedPage.id)}
                        </span>
                      ) : null}
                    </Button>
                  )}
                  {selectedPage.is_public && (
                    <Button
                      onClick={() => copyPageLink(selectedPage)}
                      variant="ghost"
                      size="sm"
                      title="Copier le lien"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  {(selectedPage.author_id === currentUserId || userType === 'client') && (
                    <Button
                      onClick={() => togglePublic(selectedPage)}
                      variant="ghost"
                      size="sm"
                      title={selectedPage.is_public ? "Rendre privée" : "Rendre publique"}
                    >
                      {selectedPage.is_public ? (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          <span className="text-xs">Publique</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          <span className="text-xs">Privée</span>
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setIsFullscreen(!isFullscreen);
                      onFullscreenChange?.(!isFullscreen);
                    }}
                    variant="ghost"
                    size="sm"
                    title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={savePage}
                    variant="default"
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                  <Button
                    onClick={() => deletePage(selectedPage.id)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isRenamingTitle ? (
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => {
                    savePage();
                    setIsRenamingTitle(false);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      savePage();
                      setIsRenamingTitle(false);
                    }
                  }}
                  className="text-2xl font-bold border-2 border-primary px-2 focus-visible:ring-2"
                  placeholder="Titre de la page"
                  autoFocus
                />
              ) : (
                <div 
                  className="text-2xl font-bold cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors flex items-center gap-2"
                  onClick={() => setIsRenamingTitle(true)}
                  title="Cliquez pour renommer"
                >
                  {editingTitle}
                  <Edit3 className="h-4 w-4 opacity-50" />
                </div>
              )}

              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{selectedPage.author_name}</span>
                  {selectedPage.author_id === currentUserId && (
                    <span className="text-xs bg-primary/10 text-primary px-1 rounded ml-1">Vous</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Modifié {formatDistanceToNow(new Date(selectedPage.updated_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                {selectedPage.last_editor_name && selectedPage.last_editor_name !== selectedPage.author_name && (
                  <div className="flex items-center gap-1">
                    <Edit3 className="h-3 w-3" />
                    <span>par {selectedPage.last_editor_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span>Version {selectedPage.version}</span>
                </div>
                <div className="flex items-center gap-1">
                  {selectedPage.is_public ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Eye className="h-3 w-3" />
                      Visible par l'équipe
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-orange-600">
                      <EyeOff className="h-3 w-3" />
                      Privée
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contenu de la page et commentaires */}
            <div className={`flex-1 overflow-y-auto ${isFullscreen ? 'p-8' : 'p-6'} flex gap-6`}>
              {/* Éditeur principal */}
              <div className="flex-1">
                <WikiEditor
                  value={editingContent}
                  onChange={setEditingContent}
                  readOnly={false}
                  placeholder="Commencez à écrire votre contenu ici..."
                  className="h-full"
                />
              </div>
              
              {/* Panneau des commentaires - affiché seulement si activé */}
              {!isFullscreen && selectedPage && showComments && selectedPage.is_public && (
                <div className="w-96 border-l pl-6 animate-in slide-in-from-right duration-200">
                  <WikiComments
                    pageId={selectedPage.id}
                    isPagePublic={selectedPage.is_public}
                    currentUserId={currentUserId}
                    onCommentCountChange={(count) => {
                      setCommentsCount(prev => new Map(prev).set(selectedPage.id, count));
                    }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Sélectionnez une page ou créez-en une nouvelle</p>
              <Button 
                onClick={() => setShowNewPageDialog(true)}
                className="mt-4"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer une page
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {!isFullscreen ? (
        <Card className="h-full">
          <CardContent className="p-0 h-full">
            {renderContent()}
          </CardContent>
        </Card>
      ) : (
        renderContent()
      )}

      {/* Dialog pour nouvelle page */}
      <Dialog open={showNewPageDialog} onOpenChange={setShowNewPageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une nouvelle page</DialogTitle>
            <DialogDescription>
              Donnez un titre à votre nouvelle page wiki
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Titre de la page"
              value={newPageTitle}
              onChange={(e) => setNewPageTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createPage()}
            />
            
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="page-visibility"
                checked={newPageIsPublic}
                onChange={(e) => setNewPageIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="page-visibility" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  {newPageIsPublic ? (
                    <>
                      <Eye className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Page publique</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">Page privée</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {newPageIsPublic 
                    ? "Cette page sera visible par tous les membres du projet" 
                    : "Cette page ne sera visible que par vous"}
                </p>
              </label>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewPageDialog(false);
                  setNewPageTitle('');
                  setNewPageIsPublic(true);
                }}
              >
                Annuler
              </Button>
              <Button onClick={createPage}>
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </>
  );
}