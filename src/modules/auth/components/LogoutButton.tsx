/**
 * Module AUTH - Composant LogoutButton
 *
 * Bouton de déconnexion avec confirmation optionnelle.
 * Basé sur les patterns existants dans l'application.
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { useState } from 'react';
import { Button } from '@/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/dialog';
import { LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LogoutButtonProps } from '../types';

/**
 * Bouton de déconnexion modulaire avec confirmation optionnelle
 */
export const LogoutButton = ({
  onLogout,
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  confirmLogout = false,
  confirmTitle = 'Confirmer la déconnexion',
  confirmMessage = 'Êtes-vous sûr de vouloir vous déconnecter ?'
}: LogoutButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  // Gestion de la déconnexion
  const handleLogout = async () => {
    setIsLoading(true);

    try {
      if (onLogout) {
        await onLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Configuration des tailles
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8'
  };

  // Contenu du bouton
  const buttonContent = children || (
    <>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Déconnexion...' : 'Se déconnecter'}
    </>
  );

  // Bouton de base
  const BaseButton = (
    <Button
      variant={variant}
      className={cn(sizeClasses[size], className)}
      disabled={isLoading}
      onClick={confirmLogout ? undefined : handleLogout}
    >
      {buttonContent}
    </Button>
  );

  // Sans confirmation
  if (!confirmLogout) {
    return BaseButton;
  }

  // Avec confirmation
  const [showDialog, setShowDialog] = useState(false);

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          className={cn(sizeClasses[size], className)}
          disabled={isLoading}
          onClick={() => setShowDialog(true)}
        >
          {buttonContent}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-orange-500" />
            {confirmTitle}
          </DialogTitle>
          <DialogDescription>
            {confirmMessage}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" disabled={isLoading} onClick={() => setShowDialog(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              handleLogout();
              setShowDialog(false);
            }}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Déconnexion...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutButton;