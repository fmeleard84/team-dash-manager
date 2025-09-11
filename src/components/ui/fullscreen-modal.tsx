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
      "fixed inset-0 z-50",
      "bg-gradient-to-br",
      "dark:from-[#0f172a] dark:via-[#1e1b4b] dark:to-[#312e81]",
      "from-gray-50 via-white to-gray-100",
      "animate-in fade-in-0 slide-in-from-bottom-4",
      className
    )}>
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 dark:bg-black/40 bg-white/60 backdrop-blur-xl" />
      
      {/* Header with neon design */}
      <div className="relative sticky top-0 z-10 border-b dark:border-purple-500/20 border-gray-200 bg-gradient-to-r dark:from-purple-900/20 dark:to-pink-900/20 from-white/80 to-gray-50/80 backdrop-blur-sm">
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
                  className="flex items-center gap-2 dark:text-white text-gray-700 dark:hover:bg-white/10 hover:bg-gray-100 dark:hover:text-white hover:text-gray-900 dark:border-purple-500/30 border-gray-200"
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
                  className="dark:text-white text-gray-700 dark:hover:bg-white/10 hover:bg-gray-100 dark:hover:text-white hover:text-gray-900"
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

      {/* Content with glassmorphism */}
      <div className={cn(
        "relative h-[calc(100vh-4rem)] overflow-y-auto flex flex-col",
        contentClassName
      )}>
        <div className="max-w-5xl mx-auto px-6 py-6 w-full flex-1 flex flex-col">
          {/* Title and description with neon styling */}
          {(title || description) && (
            <div className="mb-6">
              {title && (
                <h1 className="text-3xl font-bold dark:text-white text-gray-900 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  {title}
                </h1>
              )}
              {description && (
                <p className="mt-2 text-base dark:text-gray-300 text-gray-600">
                  {description}
                </p>
              )}
            </div>
          )}
          
          {/* Main content with glassmorphism container */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="dark:bg-black/20 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border dark:border-purple-500/20 border-gray-200 dark:shadow-2xl dark:shadow-purple-500/10 shadow-lg">
              {children}
            </div>
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
  isSaving = false,
}: ModalActionsProps & { isSaving?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {customActions}
      
      {onCancel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="bg-white/10 hover:bg-white/20 border-purple-500/30 text-white backdrop-blur-sm"
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
          className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 hover:text-red-300 backdrop-blur-sm"
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
          className="bg-white/10 hover:bg-white/20 border-purple-500/30 text-white backdrop-blur-sm"
        >
          {editText}
        </Button>
      )}
      
      {onSave && (
        <Button
          size="sm"
          onClick={onSave}
          disabled={saveDisabled || isLoading || isSaving}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/40 transition-all duration-200 border-0"
        >
          {isLoading || isSaving ? "Enregistrement..." : saveText}
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