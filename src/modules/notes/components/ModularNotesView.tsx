/**
 * ModularNotesView - Interface Principale du Module Notes
 *
 * Composant principal offrant une interface complète pour la gestion des notes :
 * - Onglets : Vue d'ensemble, Notes, Notebooks, Recherche, Statistiques
 * - Éditeur de notes riche avec auto-sauvegarde
 * - Gestion des notebooks et tags
 * - Recherche avancée et filtres
 * - Export multi-format
 * - Statistiques de productivité
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/ui/components/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Badge } from '@/ui/components/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/dialog';
import { Textarea } from '@/ui/components/textarea';
import {
  Plus,
  Search,
  Filter,
  Download,
  BookOpen,
  FileText,
  Star,
  Pin,
  Archive,
  Edit,
  Trash2,
  MoreVertical,
  TrendingUp,
  Calendar,
  Tag,
  Clock,
  BarChart3,
  Bookmark,
  Settings,
  Eye,
  Copy
} from 'lucide-react';

// Hooks du module
import {
  useNotes,
  useNoteActions,
  useNoteStats,
  useNoteSearch
} from '../hooks';

// Types du module
import type {
  ModularNotesViewProps,
  Note,
  Notebook,
  NoteFilters,
  CreateNoteData,
  CreateNotebookData
} from '../types';

export const ModularNotesView: React.FC<ModularNotesViewProps> = ({
  candidateId,
  showOverview = true,
  showStats = true,
  showExportOptions = true,
  showNotebooks = true,
  showSearch = true,
  initialFilters = {},
  className = '',
  onNoteClick,
  onNotebookClick
}) => {
  // ==========================================
  // HOOKS ET ÉTAT
  // ==========================================

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);

  // Hooks spécialisés du module
  const {
    notes,
    notebooks,
    totalCount,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    updateFilters,
    resetFilters
  } = useNotes(initialFilters, {
    pageSize: 20,
    enableRealtime: true,
    preloadNotebooks: showNotebooks
  });

  const {
    createNote,
    updateNote,
    deleteNote,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    togglePin,
    toggleFavorite,
    exportNotes,
    loading: actionLoading,
    error: actionError
  } = useNoteActions();

  const {
    stats,
    productivityMetrics,
    topTags,
    topNotebooks,
    recentTrends,
    recommendations,
    refresh: refreshStats
  } = useNoteStats({
    timeRange: 'month',
    includeTrends: true,
    includeRecommendations: true
  });

  const {
    query,
    setQuery,
    results: searchResults,
    suggestions,
    searchHistory,
    search,
    clearResults: clearSearch,
    searchMetrics
  } = useNoteSearch({
    enableSuggestions: true,
    enableHistory: true
  });

  // ==========================================
  // GESTIONNAIRES D'ÉVÉNEMENTS
  // ==========================================

  const handleNoteClick = useCallback((note: Note) => {
    setSelectedNote(note);
    onNoteClick?.(note);
  }, [onNoteClick]);

  const handleNotebookClick = useCallback((notebook: Notebook) => {
    setSelectedNotebook(notebook);
    onNotebookClick?.(notebook);
  }, [onNotebookClick]);

  const handleCreateNote = useCallback(async (data: CreateNoteData) => {
    const newNote = await createNote(data);
    if (newNote) {
      setIsCreating(false);
      refresh();
    }
  }, [createNote, refresh]);

  const handleCreateNotebook = useCallback(async (data: CreateNotebookData) => {
    const newNotebook = await createNotebook(data);
    if (newNotebook) {
      setIsCreatingNotebook(false);
      refresh();
    }
  }, [createNotebook, refresh]);

  const handleQuickAction = useCallback(async (action: string, noteId: string) => {
    switch (action) {
      case 'pin':
        await togglePin(noteId);
        break;
      case 'favorite':
        await toggleFavorite(noteId);
        break;
      case 'delete':
        if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
          await deleteNote(noteId);
        }
        break;
      default:
        return;
    }
    refresh();
  }, [togglePin, toggleFavorite, deleteNote, refresh]);

  const handleExport = useCallback(async (format: 'csv' | 'json' | 'pdf') => {
    const exported = await exportNotes(format, initialFilters);
    if (exported) {
      // Déclencher le téléchargement
      const blob = new Blob([exported], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [exportNotes, initialFilters]);

  // ==========================================
  // MÉTRIQUES ET DONNÉES CALCULÉES
  // ==========================================

  const overviewMetrics = useMemo(() => {
    return {
      totalNotes: totalCount,
      newThisWeek: recentTrends?.weekly?.[recentTrends.weekly.length - 1]?.notes || 0,
      favoriteNotes: notes.filter(n => n.is_favorite).length,
      pinnedNotes: notes.filter(n => n.is_pinned).length,
      totalWords: notes.reduce((sum, note) => sum + note.word_count, 0),
      avgReadTime: notes.length > 0
        ? Math.round(notes.reduce((sum, note) => sum + note.read_time_minutes, 0) / notes.length)
        : 0,
      productivity: productivityMetrics?.consistency_score || 0,
      quality: productivityMetrics?.quality_score || 0
    };
  }, [notes, totalCount, recentTrends, productivityMetrics]);

  // ==========================================
  // RENDU DES ONGLETS
  // ==========================================

  const renderOverviewTab = () => (
    <div className=\"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6\">
      {/* Métriques rapides */}
      <Card className=\"md:col-span-2 xl:col-span-3\">
        <CardHeader>
          <CardTitle className=\"flex items-center gap-2\">
            <TrendingUp className=\"w-5 h-5\" />
            Vue d'ensemble
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">
            <div className=\"text-center\">
              <div className=\"text-2xl font-bold text-primary-500\">{overviewMetrics.totalNotes}</div>
              <div className=\"text-sm text-neutral-600 dark:text-neutral-400\">Total notes</div>
            </div>
            <div className=\"text-center\">
              <div className=\"text-2xl font-bold text-green-500\">{overviewMetrics.newThisWeek}</div>
              <div className=\"text-sm text-neutral-600 dark:text-neutral-400\">Cette semaine</div>
            </div>
            <div className=\"text-center\">
              <div className=\"text-2xl font-bold text-yellow-500\">{overviewMetrics.favoriteNotes}</div>
              <div className=\"text-sm text-neutral-600 dark:text-neutral-400\">Favorites</div>
            </div>
            <div className=\"text-center\">
              <div className=\"text-2xl font-bold text-blue-500\">{overviewMetrics.totalWords}</div>
              <div className=\"text-sm text-neutral-600 dark:text-neutral-400\">Mots écrits</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes récentes */}
      <Card className=\"md:col-span-1 xl:col-span-2\">
        <CardHeader>
          <CardTitle className=\"flex items-center justify-between\">
            <span className=\"flex items-center gap-2\">
              <Clock className=\"w-5 h-5\" />
              Notes récentes
            </span>
            <Button
              variant=\"ghost\"
              size=\"sm\"
              onClick={() => setActiveTab('notes')}
            >
              Voir tout
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"space-y-3\">
            {notes.slice(0, 5).map((note) => (
              <div
                key={note.id}
                className=\"flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors\"
                onClick={() => handleNoteClick(note)}
              >
                <div className=\"flex-1 min-w-0\">
                  <h4 className=\"font-medium truncate\">{note.title}</h4>
                  <p className=\"text-sm text-neutral-600 dark:text-neutral-400 line-clamp-1\">
                    {note.content.slice(0, 100)}...
                  </p>
                </div>
                <div className=\"flex items-center gap-2 ml-4\">
                  {note.is_pinned && <Pin className=\"w-4 h-4 text-yellow-500\" />}
                  {note.is_favorite && <Star className=\"w-4 h-4 text-yellow-500\" />}
                  <span className=\"text-xs text-neutral-500\">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notebooks populaires */}
      {showNotebooks && (
        <Card className=\"md:col-span-1\">
          <CardHeader>
            <CardTitle className=\"flex items-center gap-2\">
              <BookOpen className=\"w-5 h-5\" />
              Carnets populaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className=\"space-y-3\">
              {topNotebooks.slice(0, 3).map((notebook) => (
                <div
                  key={notebook.id}
                  className=\"flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors\"
                  onClick={() => handleNotebookClick(notebook)}
                >
                  <div className=\"flex items-center gap-3\">
                    <div className=\"w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-xs font-bold\">
                      {notebook.name.charAt(0)}
                    </div>
                    <div>
                      <div className=\"font-medium\">{notebook.name}</div>
                      <div className=\"text-xs text-neutral-500\">{notebook.notes_count} notes</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions rapides */}
      <Card className=\"md:col-span-2 xl:col-span-3\">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"flex flex-wrap gap-3\">
            <Button onClick={() => setIsCreating(true)} className=\"flex items-center gap-2\">
              <Plus className=\"w-4 h-4\" />
              Nouvelle note
            </Button>
            {showNotebooks && (
              <Button variant=\"outline\" onClick={() => setIsCreatingNotebook(true)} className=\"flex items-center gap-2\">
                <BookOpen className=\"w-4 h-4\" />
                Nouveau carnet
              </Button>
            )}
            {showSearch && (
              <Button variant=\"outline\" onClick={() => setActiveTab('search')} className=\"flex items-center gap-2\">
                <Search className=\"w-4 h-4\" />
                Rechercher
              </Button>
            )}
            {showExportOptions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant=\"outline\" className=\"flex items-center gap-2\">
                    <Download className=\"w-4 h-4\" />
                    Exporter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNotesTab = () => (
    <div className=\"space-y-6\">
      {/* Header avec contrôles */}
      <div className=\"flex items-center justify-between\">
        <div>
          <h2 className=\"text-2xl font-semibold\">Mes Notes</h2>
          <p className=\"text-neutral-600 dark:text-neutral-400\">
            {totalCount} note{totalCount !== 1 ? 's' : ''} au total
          </p>
        </div>
        <div className=\"flex items-center gap-3\">
          <Button onClick={() => setIsCreating(true)} className=\"flex items-center gap-2\">
            <Plus className=\"w-4 h-4\" />
            Nouvelle note
          </Button>
          <Button variant=\"outline\" onClick={refresh} disabled={loading}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filtres rapides */}
      <Card>
        <CardContent className=\"pt-6\">
          <div className=\"flex flex-wrap items-center gap-3\">
            <Button
              variant=\"outline\"
              size=\"sm\"
              onClick={() => updateFilters({ is_favorite: true })}
            >
              <Star className=\"w-4 h-4 mr-2\" />
              Favorites
            </Button>
            <Button
              variant=\"outline\"
              size=\"sm\"
              onClick={() => updateFilters({ is_pinned: true })}
            >
              <Pin className=\"w-4 h-4 mr-2\" />
              Épinglées
            </Button>
            <Button
              variant=\"outline\"
              size=\"sm\"
              onClick={() => updateFilters({ status: ['draft'] })}
            >
              <Edit className=\"w-4 h-4 mr-2\" />
              Brouillons
            </Button>
            <Button
              variant=\"ghost\"
              size=\"sm\"
              onClick={resetFilters}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des notes */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4\">
        {notes.map((note) => (
          <Card key={note.id} className=\"cursor-pointer hover:shadow-md transition-shadow\">
            <CardHeader className=\"pb-3\">
              <div className=\"flex items-start justify-between\">
                <CardTitle className=\"text-lg line-clamp-2\" onClick={() => handleNoteClick(note)}>
                  {note.title}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant=\"ghost\" size=\"sm\">
                      <MoreVertical className=\"w-4 h-4\" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleQuickAction('pin', note.id)}>
                      <Pin className=\"w-4 h-4 mr-2\" />
                      {note.is_pinned ? 'Désépingler' : 'Épingler'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickAction('favorite', note.id)}>
                      <Star className=\"w-4 h-4 mr-2\" />
                      {note.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleQuickAction('delete', note.id)}
                      className=\"text-red-600 dark:text-red-400\"
                    >
                      <Trash2 className=\"w-4 h-4 mr-2\" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className=\"flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400\">
                <span className=\"flex items-center gap-1\">
                  <Clock className=\"w-3 h-3\" />
                  {note.read_time_minutes} min
                </span>
                <span>{note.word_count} mots</span>
                {note.is_pinned && <Pin className=\"w-3 h-3 text-yellow-500\" />}
                {note.is_favorite && <Star className=\"w-3 h-3 text-yellow-500\" />}
              </div>
            </CardHeader>
            <CardContent onClick={() => handleNoteClick(note)}>
              <p className=\"text-neutral-600 dark:text-neutral-400 line-clamp-3 mb-4\">
                {note.content.slice(0, 150)}...
              </p>
              {note.tags.length > 0 && (
                <div className=\"flex flex-wrap gap-1\">
                  {note.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant=\"secondary\" className=\"text-xs\">
                      {tag}
                    </Badge>
                  ))}
                  {note.tags.length > 3 && (
                    <Badge variant=\"outline\" className=\"text-xs\">
                      +{note.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bouton Charger plus */}
      {hasMore && (
        <div className=\"text-center\">
          <Button onClick={loadMore} disabled={loading} variant=\"outline\">
            {loading ? 'Chargement...' : 'Charger plus'}
          </Button>
        </div>
      )}
    </div>
  );

  // ==========================================
  // GESTION DES ERREURS
  // ==========================================

  if (error) {
    return (
      <Card className=\"p-6\">
        <div className=\"text-center text-red-600 dark:text-red-400\">
          <p>Erreur lors du chargement des notes: {error}</p>
          <Button onClick={refresh} className=\"mt-4\">
            Réessayer
          </Button>
        </div>
      </Card>
    );
  }

  // ==========================================
  // RENDU PRINCIPAL
  // ==========================================

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className=\"w-full\">
        <TabsList className=\"grid w-full grid-cols-5\">
          {showOverview && (
            <TabsTrigger value=\"overview\" className=\"flex items-center gap-2\">
              <BarChart3 className=\"w-4 h-4\" />
              Vue d'ensemble
            </TabsTrigger>
          )}
          <TabsTrigger value=\"notes\" className=\"flex items-center gap-2\">
            <FileText className=\"w-4 h-4\" />
            Notes ({totalCount})
          </TabsTrigger>
          {showNotebooks && (
            <TabsTrigger value=\"notebooks\" className=\"flex items-center gap-2\">
              <BookOpen className=\"w-4 h-4\" />
              Carnets
            </TabsTrigger>
          )}
          {showSearch && (
            <TabsTrigger value=\"search\" className=\"flex items-center gap-2\">
              <Search className=\"w-4 h-4\" />
              Recherche
            </TabsTrigger>
          )}
          {showStats && (
            <TabsTrigger value=\"stats\" className=\"flex items-center gap-2\">
              <TrendingUp className=\"w-4 h-4\" />
              Statistiques
            </TabsTrigger>
          )}
        </TabsList>

        {showOverview && (
          <TabsContent value=\"overview\">
            {renderOverviewTab()}
          </TabsContent>
        )}

        <TabsContent value=\"notes\">
          {renderNotesTab()}
        </TabsContent>

        {showNotebooks && (
          <TabsContent value=\"notebooks\">
            <div className=\"text-center py-8\">
              <BookOpen className=\"w-12 h-12 mx-auto text-neutral-400 mb-4\" />
              <p className=\"text-neutral-600 dark:text-neutral-400\">
                Interface des carnets en cours de développement
              </p>
            </div>
          </TabsContent>
        )}

        {showSearch && (
          <TabsContent value=\"search\">
            <div className=\"text-center py-8\">
              <Search className=\"w-12 h-12 mx-auto text-neutral-400 mb-4\" />
              <p className=\"text-neutral-600 dark:text-neutral-400\">
                Interface de recherche en cours de développement
              </p>
            </div>
          </TabsContent>
        )}

        {showStats && (
          <TabsContent value=\"stats\">
            <div className=\"text-center py-8\">
              <TrendingUp className=\"w-12 h-12 mx-auto text-neutral-400 mb-4\" />
              <p className=\"text-neutral-600 dark:text-neutral-400\">
                Interface de statistiques en cours de développement
              </p>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Modales de création */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className=\"max-w-2xl\">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle note</DialogTitle>
          </DialogHeader>
          <NoteEditor
            onSave={handleCreateNote}
            onCancel={() => setIsCreating(false)}
            notebooks={notebooks}
          />
        </DialogContent>
      </Dialog>

      {showNotebooks && (
        <Dialog open={isCreatingNotebook} onOpenChange={setIsCreatingNotebook}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau carnet</DialogTitle>
            </DialogHeader>
            <NotebookEditor
              onSave={handleCreateNotebook}
              onCancel={() => setIsCreatingNotebook(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// ==========================================
// COMPOSANTS INTERNES
// ==========================================

interface NoteEditorProps {
  note?: Note;
  notebooks: Notebook[];
  onSave: (data: CreateNoteData) => void;
  onCancel: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  notebooks,
  onSave,
  onCancel
}) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState(note?.tags?.join(', ') || '');
  const [notebookId, setNotebookId] = useState(note?.notebook_id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    onSave({
      title: title.trim(),
      content: content.trim(),
      tags: tagsArray,
      notebook_id: notebookId || null,
      type: 'personal',
      format: 'markdown',
      status: 'draft',
      priority: 'medium'
    });
  };

  return (
    <form onSubmit={handleSubmit} className=\"space-y-4\">
      <div>
        <label className=\"block text-sm font-medium mb-2\">Titre *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder=\"Titre de la note\"
          required
        />
      </div>

      <div>
        <label className=\"block text-sm font-medium mb-2\">Carnet</label>
        <select
          value={notebookId}
          onChange={(e) => setNotebookId(e.target.value)}
          className=\"w-full p-2 border rounded-lg bg-white dark:bg-neutral-800\"
        >
          <option value=\"\">Aucun carnet</option>
          {notebooks.map((notebook) => (
            <option key={notebook.id} value={notebook.id}>
              {notebook.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className=\"block text-sm font-medium mb-2\">Contenu</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder=\"Contenu de la note...\"
          rows={8}
        />
      </div>

      <div>
        <label className=\"block text-sm font-medium mb-2\">Tags</label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder=\"tag1, tag2, tag3\"
        />
        <p className=\"text-xs text-neutral-500 mt-1\">Séparez les tags par des virgules</p>
      </div>

      <div className=\"flex justify-end gap-3 pt-4\">
        <Button type=\"button\" variant=\"outline\" onClick={onCancel}>
          Annuler
        </Button>
        <Button type=\"submit\" disabled={!title.trim()}>
          {note ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

interface NotebookEditorProps {
  notebook?: Notebook;
  onSave: (data: CreateNotebookData) => void;
  onCancel: () => void;
}

const NotebookEditor: React.FC<NotebookEditorProps> = ({
  notebook,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(notebook?.name || '');
  const [description, setDescription] = useState(notebook?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className=\"space-y-4\">
      <div>
        <label className=\"block text-sm font-medium mb-2\">Nom du carnet *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder=\"Mon carnet\"
          required
        />
      </div>

      <div>
        <label className=\"block text-sm font-medium mb-2\">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder=\"Description du carnet...\"
          rows={3}
        />
      </div>

      <div className=\"flex justify-end gap-3 pt-4\">
        <Button type=\"button\" variant=\"outline\" onClick={onCancel}>
          Annuler
        </Button>
        <Button type=\"submit\" disabled={!name.trim()}>
          {notebook ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};