import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Badge } from '@/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/ui/components/dropdown-menu';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Copy,
  Share2,
  Maximize2,
  Minimize2,
  Clock,
  User,
  MessageCircle,
  Star,
  StarOff,
  Download,
  Upload,
  Settings,
  MoreVertical,
  FileText,
  Globe,
  Lock,
  ChevronRight,
  Home,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Hooks du module
import { useWiki, useWikiActions, useWikiComments, useWikiSearch } from '../hooks';
import {
  WikiPage,
  WikiFilters,
  CreateWikiPageData,
  WikiSortOption
} from '../types';

// Import des composants existants (backward compatibility)
import WikiEditor from '@/components/wiki/WikiEditor';
import WikiComments from '@/components/wiki/WikiComments';
import WikiNavigation from '@/components/wiki/WikiNavigation';

interface ModularWikiViewProps {
  projectId: string;
  userType: 'client' | 'candidate';
  onFullscreenChange?: (isFullscreen: boolean) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list' | 'tree';

export function ModularWikiView({
  projectId,
  userType,
  onFullscreenChange,
  className = ""
}: ModularWikiViewProps) {
  // États locaux
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [showNewPageDialog, setShowNewPageDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageIsPublic, setNewPageIsPublic] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Filtres
  const [filters, setFilters] = useState<WikiFilters>({
    sort_by: 'updated_at',
    sort_order: 'desc'
  });

  // Hooks du module WIKI
  const {
    pages,
    loading,
    error,
    navigation,
    stats,
    refetch,
    refetchPages
  } = useWiki({
    projectId,
    filters,
    realtime: true
  });

  const {
    createPage,
    updatePage,
    deletePage,
    duplicatePage,
    togglePageVisibility,
    addPageToFavorites,
    removePageFromFavorites
  } = useWikiActions();

  const {
    search: searchPages,
    results: searchResults,
    loading: searchLoading,
    clearSearch
  } = useWikiSearch({ projectId });

  const { comments: selectedPageComments } = useWikiComments({
    pageId: selectedPage?.id || '',
    realtime: true
  });

  // Données calculées
  const currentUserId = 'current_user'; // À récupérer du contexte auth
  const isOwner = selectedPage?.author_id === currentUserId;
  const canEdit = isOwner || userType === 'client';

  // Navigation breadcrumb
  const breadcrumbPath = useMemo(() => {
    if (!selectedPage || !navigation) return [];

    const path: WikiPage[] = [];
    let current = selectedPage;

    while (current) {
      path.unshift(current);
      if (current.parent_id) {
        current = navigation.pages.find(p => p.id === current.parent_id) || null;
      } else {
        break;
      }
    }

    return path;
  }, [selectedPage, navigation]);

  // Pages filtrées pour l'affichage
  const filteredPages = useMemo(() => {
    if (showSearch && searchQuery) {
      return searchResults.map(result => result.page);
    }

    let filtered = pages;

    if (searchQuery && !showSearch) {
      filtered = pages.filter(page =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [pages, searchResults, searchQuery, showSearch]);

  // Gestionnaires d'événements
  const handleCreatePage = useCallback(async () => {
    if (!newPageTitle.trim()) return;

    try {
      const newPageData: CreateWikiPageData = {
        project_id: projectId,
        title: newPageTitle.trim(),
        content: `<h1>${newPageTitle.trim()}</h1><p>Commencez à écrire votre contenu ici...</p>`,
        is_public: newPageIsPublic
      };

      const newPage = await createPage(newPageData);
      setSelectedPage(newPage);
      setShowNewPageDialog(false);
      setNewPageTitle('');
      setNewPageIsPublic(true);
      refetchPages();
    } catch (error) {
      console.error('Erreur lors de la création de la page:', error);
    }
  }, [newPageTitle, newPageIsPublic, projectId, createPage, refetchPages]);

  const handleSavePage = useCallback(async () => {
    if (!selectedPage || !editingTitle.trim()) return;

    try {
      const updatedPage = await updatePage(selectedPage.id, {
        title: editingTitle.trim(),
        content: editingContent,
        is_major_change: true
      });

      setSelectedPage(updatedPage);
      setIsEditing(false);
      setIsRenamingTitle(false);
      refetchPages();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  }, [selectedPage, editingTitle, editingContent, updatePage, refetchPages]);

  const handleDeletePage = useCallback(async (pageId: string) => {
    try {
      const success = await deletePage(pageId);
      if (success) {
        if (selectedPage?.id === pageId) {
          setSelectedPage(null);
        }
        refetchPages();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  }, [deletePage, selectedPage, refetchPages]);

  const handleToggleVisibility = useCallback(async (page: WikiPage) => {
    try {
      await togglePageVisibility(page.id);
      refetchPages();
    } catch (error) {
      console.error('Erreur lors du changement de visibilité:', error);
    }
  }, [togglePageVisibility, refetchPages]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setShowSearch(true);
      searchPages(query);
    } else {
      setShowSearch(false);
      clearSearch();
    }
  }, [searchPages, clearSearch]);

  // Sélection d'une page
  const handlePageSelect = useCallback((page: WikiPage) => {
    setSelectedPage(page);
    setEditingTitle(page.title);
    setEditingContent(page.content || '');
    setIsEditing(true);
    setIsRenamingTitle(false);
  }, []);

  // Rendu du contenu principal
  const renderContent = () => (
    <div className={`h-full flex transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Sidebar avec navigation */}
      <div className={`border-r bg-background flex flex-col transition-all duration-300 ${isFullscreen ? 'w-64' : 'w-80'}`}>
        {/* Header de la sidebar */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5" />
            <h2 className="font-semibold">Wiki du Projet</h2>
            {stats && (
              <Badge variant="secondary" className="ml-auto">
                {stats.total_pages}
              </Badge>
            )}
          </div>

          {/* Barre de recherche */}
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
            {searchLoading && (
              <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowNewPageDialog(true)}
              size="sm"
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Page
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {viewMode === 'grid' && <Grid className="h-4 w-4" />}
                  {viewMode === 'list' && <List className="h-4 w-4" />}
                  {viewMode === 'tree' && <FileText className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setViewMode('tree')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Vue Arbre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4 mr-2" />
                  Vue Liste
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('grid')}>
                  <Grid className="h-4 w-4 mr-2" />
                  Vue Grille
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Liste des pages */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center text-muted-foreground p-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          ) : error ? (
            <div className="text-center text-destructive p-4">
              {error.message}
            </div>
          ) : viewMode === 'tree' && navigation ? (
            <WikiNavigation
              pages={filteredPages}
              selectedPageId={selectedPage?.id || null}
              currentUserId={currentUserId}
              onPageSelect={handlePageSelect}
              userProfiles={new Map(navigation.authors.map(a => [a.id, a.name]))}
            />
          ) : (
            <div className="space-y-2">
              {filteredPages.map(page => (
                <Card
                  key={page.id}
                  className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                    selectedPage?.id === page.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => handlePageSelect(page)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{page.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {page.author_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {page.comments_count && page.comments_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {page.comments_count}
                        </Badge>
                      )}
                      {page.is_public ? (
                        <Globe className="h-3 w-3 text-green-600" />
                      ) : (
                        <Lock className="h-3 w-3 text-orange-600" />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
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
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="h-4 w-4" />
                  {breadcrumbPath.map((page, index) => (
                    <React.Fragment key={page.id}>
                      {index > 0 && <ChevronRight className="h-4 w-4" />}
                      <button
                        onClick={() => handlePageSelect(page)}
                        className="hover:text-foreground transition-colors"
                      >
                        {page.title}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {selectedPage.is_public && (
                    <Button
                      onClick={() => setShowComments(!showComments)}
                      variant={showComments ? "default" : "ghost"}
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {selectedPageComments.length > 0 && (
                        <span className="ml-1">{selectedPageComments.length}</span>
                      )}
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => duplicatePage(selectedPage.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      {canEdit && (
                        <>
                          <DropdownMenuItem onClick={() => handleToggleVisibility(selectedPage)}>
                            {selectedPage.is_public ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Rendre privée
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Rendre publique
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeletePage(selectedPage.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    onClick={() => {
                      setIsFullscreen(!isFullscreen);
                      onFullscreenChange?.(!isFullscreen);
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>

                  {canEdit && (
                    <Button onClick={handleSavePage} size="sm">
                      Sauvegarder
                    </Button>
                  )}
                </div>
              </div>

              {/* Titre */}
              {isRenamingTitle && canEdit ? (
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleSavePage}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSavePage();
                    }
                  }}
                  className="text-2xl font-bold"
                  autoFocus
                />
              ) : (
                <h1
                  className={`text-2xl font-bold ${canEdit ? 'cursor-pointer hover:bg-accent/50 rounded px-2 py-1' : ''}`}
                  onClick={() => canEdit && setIsRenamingTitle(true)}
                >
                  {editingTitle}
                </h1>
              )}

              {/* Métadonnées */}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{selectedPage.author_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Modifié {formatDistanceToNow(new Date(selectedPage.updated_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                {selectedPage.is_public ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    <Lock className="h-3 w-3 mr-1" />
                    Privé
                  </Badge>
                )}
              </div>
            </div>

            {/* Contenu et commentaires */}
            <div className={`flex-1 overflow-y-auto ${isFullscreen ? 'p-8' : 'p-6'} flex gap-6`}>
              {/* Éditeur principal */}
              <div className="flex-1">
                <WikiEditor
                  value={editingContent}
                  onChange={setEditingContent}
                  readOnly={!canEdit}
                  placeholder="Commencez à écrire votre contenu ici..."
                  className="h-full"
                />
              </div>

              {/* Panneau des commentaires */}
              {!isFullscreen && showComments && selectedPage.is_public && (
                <div className="w-96 border-l pl-6">
                  <WikiComments
                    pageId={selectedPage.id}
                    isPagePublic={selectedPage.is_public}
                    currentUserId={currentUserId}
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
        <Card className={`h-full ${className}`}>
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
              onKeyPress={(e) => e.key === 'Enter' && handleCreatePage()}
            />

            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="page-visibility"
                checked={newPageIsPublic}
                onChange={(e) => setNewPageIsPublic(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="page-visibility" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  {newPageIsPublic ? (
                    <>
                      <Globe className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Page publique</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-orange-600" />
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
              <Button onClick={handleCreatePage} disabled={!newPageTitle.trim()}>
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}