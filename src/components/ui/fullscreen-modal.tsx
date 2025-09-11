import React, { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  showBackButton?: boolean;
  backButtonText?: string;
  preventClose?: boolean;
  hideCloseButton?: boolean;
}

export function FullScreenModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  className,
  contentClassName,
  showBackButton = true,
  backButtonText = "Retour",
  preventClose = false,
  hideCloseButton = false,
}: FullScreenModalProps) {
  // Handle ESC key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !preventClose) {
      onClose();
    }
  }, [onClose, preventClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const modalContent = (
    <div className={cn(
      "fixed inset-0 z-50 bg-background",
      "animate-in fade-in-0 slide-in-from-bottom-4",
      className
    )}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Back button */}
            <div className="flex items-center gap-4">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={preventClose}
                  className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {backButtonText}
                </Button>
              )}
              {!showBackButton && !hideCloseButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  disabled={preventClose}
                  className="hover:bg-accent hover:text-accent-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Right side - Actions */}
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "h-[calc(100vh-4rem)] overflow-y-auto flex flex-col",
        contentClassName
      )}>
        <div className="max-w-5xl mx-auto px-6 py-6 w-full flex-1 flex flex-col">
          {/* Title and description */}
          {(title || description) && (
            <div className="mb-6">
              {title && <h1 className="text-3xl font-bold text-foreground">{title}</h1>}
              {description && (
                <p className="mt-2 text-base text-muted-foreground">{description}</p>
              )}
            </div>
          )}
          
          {/* Main content - same alignment as title */}
          <div className="flex-1 flex flex-col min-h-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render at root level
  return createPortal(modalContent, document.body);
}

// Composant pour le header d'actions prédéfinies
interface ModalActionsProps {
  onSave?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  saveText?: string;
  editText?: string;
  deleteText?: string;
  cancelText?: string;
  saveDisabled?: boolean;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  isLoading?: boolean;
  customActions?: React.ReactNode;
}

export function ModalActions({
  onSave,
  onEdit,
  onDelete,
  onCancel,
  saveText = "Enregistrer",
  editText = "Modifier",
  deleteText = "Supprimer",
  cancelText = "Annuler",
  saveDisabled = false,
  editDisabled = false,
  deleteDisabled = false,
  isLoading = false,
  customActions,
}: ModalActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {customActions}
      
      {onCancel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
      )}
      
      {onDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={deleteDisabled || isLoading}
          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
        >
          {deleteText}
        </Button>
      )}
      
      {onEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          disabled={editDisabled || isLoading}
        >
          {editText}
        </Button>
      )}
      
      {onSave && (
        <Button
          size="sm"
          onClick={onSave}
          disabled={saveDisabled || isLoading}
          className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {isLoading ? "Enregistrement..." : saveText}
        </Button>
      )}
    </div>
  );
}

// Hook pour faciliter l'utilisation du modal
export function useFullScreenModal() {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  
  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen
  };
}