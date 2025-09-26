import React, { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import modular components
import LLMSidebar from '@/components/llm/LLMSidebar';
import LLMContentViewer from '@/components/llm/LLMContentViewer';
import LLMEditor from '@/components/llm/LLMEditor';
import { documentationSections, getSectionTitle, getSectionContent } from '@/components/llm/LLMDocumentationSections';

// Lazy load design system modal
const DesignSystemModal = lazy(() => import('./DesignSystemModal'));

const LLMDashboard = () => {
  const { toast } = useToast();

  // State management
  const [activeSection, setActiveSection] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['projet', 'candidat', 'database'])
  );
  const [content, setContent] = useState<Record<string, string>>(documentationSections);
  const [isSaving, setIsSaving] = useState(false);

  // Section management handlers
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setIsEditing(false); // Exit editing mode when switching sections
  };

  // Content management handlers
  const getContent = () => {
    return content[activeSection] || getSectionContent(activeSection);
  };

  const handleContentChange = (value: string) => {
    setContent({
      ...content,
      [activeSection]: value
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Here you would typically save to a backend or localStorage
      // For now, we'll just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Sauvegarde réussie",
        description: "La documentation a été mise à jour.",
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset content to original
    const updatedContent = { ...content };
    delete updatedContent[activeSection]; // This will fall back to default content
    setContent(updatedContent);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  // Check if section should show edit functionality
  const shouldShowEditButton = !activeSection.startsWith('design-');

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <LLMSidebar
        activeSection={activeSection}
        expandedSections={expandedSections}
        onSectionChange={handleSectionChange}
        onToggleSection={toggleSection}
      />

      {/* Main Content */}
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
                  <CardTitle className="text-2xl text-gray-900">
                    {getSectionTitle(activeSection)}
                  </CardTitle>
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
                    {activeSection.startsWith('projet') && activeSection !== 'projet-demarrage' &&
                      "Documentation des processus et outils projet"
                    }
                    {activeSection.startsWith('wiki') &&
                      "Système collaboratif de documentation"
                    }
                    {activeSection.startsWith('api') &&
                      "Documentation technique des APIs et intégrations"
                    }
                    {activeSection.startsWith('corrections') &&
                      "Historique des corrections et améliorations"
                    }
                    {activeSection.startsWith('design') &&
                      "Documentation du système de design"
                    }
                    {activeSection.startsWith('payment') &&
                      "Système de paiement et gestion des crédits"
                    }
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {shouldShowEditButton && !isEditing && (
                    <Button onClick={handleEdit} variant="outline" size="sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Éditer
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Render design system modal for specific sections */}
              {activeSection === 'design-modal' ? (
                <Suspense fallback={<div className="flex items-center justify-center p-8">Chargement...</div>}>
                  <DesignSystemModal />
                </Suspense>
              ) : isEditing ? (
                /* Editing Mode */
                <LLMEditor
                  sectionId={activeSection}
                  content={getContent()}
                  onContentChange={handleContentChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isSaving={isSaving}
                />
              ) : (
                /* Viewing Mode */
                <LLMContentViewer
                  sectionId={activeSection}
                  content={getContent()}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LLMDashboard;