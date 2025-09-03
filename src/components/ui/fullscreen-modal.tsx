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
      "fixed inset-0 z-50 bg-white",
      "animate-in fade-in-0 slide-in-from-bottom-4",
      className
    )}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
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
                  className="flex items-center gap-2 hover:bg-gray-100"
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
                  className="hover:bg-gray-100"
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
        "h-[calc(100vh-5rem)] overflow-y-auto",
        contentClassName
      )}>
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Title and description */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {description && (
              <p className="mt-2 text-base text-gray-600">{description}</p>
            )}
          </div>
          
          {/* Main content - same alignment as title */}
          {children}
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
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
          className="bg-purple-600 hover:bg-purple-700 text-white"
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