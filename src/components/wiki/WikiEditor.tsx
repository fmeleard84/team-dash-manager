import React, { useMemo, useEffect } from 'react';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useTheme } from '@/hooks/use-theme';

interface WikiEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export default function WikiEditor({ 
  value, 
  onChange, 
  readOnly = false, 
  placeholder = "Commencez à écrire ou appuyez sur '/' pour les commandes...",
  className = ""
}: WikiEditorProps) {
  const { theme } = useTheme();
  
  // Créer l'éditeur avec le contenu initial
  const editor = useMemo(() => {
    let initialBlocks: PartialBlock[] | undefined = undefined;
    
    // Parser le contenu initial de manière synchrone
    if (value) {
      try {
        if (value.startsWith('<')) {
          // Pour le HTML, on crée un contenu par défaut pour l'instant
          // Le contenu sera mis à jour après le montage
          initialBlocks = [{
            type: "paragraph",
            content: "Chargement..."
          } as PartialBlock];
        } else if (value.trim()) {
          initialBlocks = [{
            type: "paragraph",
            content: value
          } as PartialBlock];
        }
      } catch (error) {
        console.error('Erreur lors du parsing du contenu initial:', error);
        initialBlocks = [{
          type: "paragraph",
          content: value || ""
        } as PartialBlock];
      }
    }
    
    const editor = BlockNoteEditor.create({
      initialContent: initialBlocks,
      uploadFile: async (file: File) => {
        // Pour l'instant, on convertit en base64
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      },
    });

    return editor;
  }, []); // L'éditeur est créé une seule fois
  
  // Gérer les changements dans un useEffect séparé
  useEffect(() => {
    const handleChange = () => {
      // Convertir les blocs en HTML de manière asynchrone
      editor.blocksToHTMLLossy(editor.document).then((html) => {
        onChange(html);
      }).catch((error) => {
        console.error('Erreur lors de la conversion HTML:', error);
      });
    };
    
    // Ajouter le listener
    editor.onChange(handleChange);
    
    // Cleanup si nécessaire
    return () => {
      // BlockNoteEditor ne semble pas avoir de méthode pour retirer les listeners
      // mais on pourrait l'ajouter si nécessaire
    };
  }, [editor, onChange]);

  // Mettre à jour le contenu quand la valeur change
  useEffect(() => {
    // Ne pas mettre à jour si l'éditeur est en train d'être modifié
    const updateContent = async () => {
      try {
        let blocks: PartialBlock[] = [];
        
        if (value && value.startsWith('<')) {
          // Parser le HTML
          blocks = await editor.tryParseHTMLToBlocks(value) || [];
        } else if (value) {
          // Texte simple
          blocks = [{
            type: "paragraph",
            content: value
          } as PartialBlock];
        } else {
          // Contenu vide
          blocks = [{
            type: "paragraph",
            content: ""
          } as PartialBlock];
        }
        
        // Remplacer uniquement si le contenu est différent
        const currentHTML = await editor.blocksToHTMLLossy(editor.document);
        if (currentHTML !== value) {
          editor.replaceBlocks(editor.document, blocks);
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour du contenu:', error);
      }
    };
    
    updateContent();
  }, [value, editor]);

  // Styles personnalisés pour l'éditeur
  const editorStyles = `
    .wiki-editor {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .bn-container {
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: white;
      font-family: inherit;
      height: 100%;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    
    .bn-editor {
      min-height: 400px;
      padding: 16px;
      flex: 1;
      overflow-y: auto;
      height: 100%;
    }
    
    ${readOnly ? `
      .bn-editor {
        background: #f9fafb;
      }
      
      .bn-inline-content {
        cursor: default !important;
      }
    ` : ''}
    
    /* Amélioration des styles pour le thème sombre */
    ${theme === 'dark' ? `
      .bn-container {
        background: #1f2937;
        border-color: #374151;
      }
      
      .bn-editor {
        background: #1f2937;
        color: #f3f4f6;
      }
      
      .bn-inline-content {
        color: #f3f4f6;
      }
      
      .bn-side-menu {
        background: #374151;
        border-color: #4b5563;
      }
      
      .bn-formatting-toolbar {
        background: #374151;
        border-color: #4b5563;
      }
      
      .bn-slash-menu {
        background: #374151;
        border-color: #4b5563;
      }
    ` : ''}
    
    /* Styles pour les différents types de blocs */
    .bn-block-heading {
      font-weight: bold;
      margin: 0.5em 0;
    }
    
    .bn-block-heading[data-level="1"] {
      font-size: 2em;
    }
    
    .bn-block-heading[data-level="2"] {
      font-size: 1.5em;
    }
    
    .bn-block-heading[data-level="3"] {
      font-size: 1.17em;
    }
    
    .bn-block-quote {
      border-left: 4px solid #e5e7eb;
      padding-left: 16px;
      margin: 16px 0;
      font-style: italic;
      color: #6b7280;
    }
    
    .bn-block-code {
      background: #1f2937;
      color: #f3f4f6;
      padding: 12px;
      border-radius: 6px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      overflow-x: auto;
    }
    
    .bn-inline-code {
      background: #f3f4f6;
      color: #dc2626;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    /* Menu slash amélioré */
    .bn-slash-menu {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      max-height: 400px;
      overflow-y: auto;
    }
    
    .bn-slash-menu-item {
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .bn-slash-menu-item:hover {
      background: #f3f4f6;
    }
    
    .bn-slash-menu-item[data-selected="true"] {
      background: #ddd6fe;
      color: #7c3aed;
    }
    
    /* Amélioration de la toolbar flottante */
    .bn-formatting-toolbar-menu {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .bn-formatting-toolbar-menu button:hover {
      background: #f3f4f6;
    }
    
    .bn-formatting-toolbar-menu button[data-selected="true"] {
      background: #ddd6fe;
      color: #7c3aed;
    }
    
    /* Side menu (drag handle) */
    .bn-side-menu {
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .bn-block-outer:hover .bn-side-menu {
      opacity: 1;
    }
    
    .bn-drag-handle {
      cursor: grab;
    }
    
    .bn-drag-handle:active {
      cursor: grabbing;
    }
    
    /* Responsive design */
    @media (max-width: 640px) {
      .bn-editor {
        padding: 12px;
      }
      
      .bn-formatting-toolbar {
        width: 100%;
        left: 0 !important;
        right: 0 !important;
        margin: 0 8px;
      }
    }
  `;

  return (
    <div className={`wiki-editor ${className}`}>
      <style>{editorStyles}</style>
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        theme={theme === 'dark' ? 'dark' : 'light'}
        data-placeholder={placeholder}
      />
    </div>
  );
}