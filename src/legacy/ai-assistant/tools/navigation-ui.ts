/**
 * Implémentation des fonctions de navigation et UI
 */

import { toast } from '@/hooks/use-toast';

export interface NavigationResult {
  success: boolean;
  destination: string;
  message: string;
  error?: string;
}

export interface NotificationResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Naviguer vers une section spécifique de l'application
 */
export async function navigate_to(args: {
  destination: string;
  project_id?: string;
  open_in_new_tab?: boolean;
}): Promise<NavigationResult> {
  try {
    // Mapper les destinations aux routes
    const routeMap: Record<string, string> = {
      'dashboard': '/dashboard',
      'projects': '/projects',
      'kanban': '/kanban',
      'planning': '/planning',
      'messages': '/messages',
      'drive': '/drive',
      'wiki': '/wiki',
      'invoices': '/invoices',
      'settings': '/settings',
      'reactflow': '/reactflow'
    };

    const basePath = routeMap[args.destination];
    if (!basePath) {
      return {
        success: false,
        destination: args.destination,
        message: `Destination "${args.destination}" non reconnue`,
        error: 'Invalid destination'
      };
    }

    // Construire l'URL complète
    let fullPath = basePath;
    if (args.project_id) {
      // Pour les routes spécifiques au projet
      if (['Kanban', 'Planning', 'Messages', 'Drive', 'Wiki'].includes(args.destination)) {
        fullPath = `/project/${args.project_id}${basePath}`;
      }
    }

    // Naviguer
    if (args.open_in_new_tab) {
      window.open(fullPath, '_blank');
    } else {
      // Utiliser le router React si disponible
      if (window.location.pathname !== fullPath) {
        window.location.href = fullPath;
      }
    }

    return {
      success: true,
      destination: fullPath,
      message: `Navigation vers ${args.destination}${args.open_in_new_tab ? ' in un nouvel onglet' : ''}`
    };

  } catch (error) {
    console.error('Error in navigate_to:', error);
    return {
      success: false,
      destination: args.destination,
      message: 'Erreur lors de la navigation',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Afficher une notification à l'utilisateur
 */
export async function show_notification(args: {
  message: string;
  type?: string;
  duration?: number;
}): Promise<NotificationResult> {
  try {
    // Mapper le type aux variantes de toast
    const variantMap: Record<string, 'default' | 'destructive'> = {
      'info': 'default',
      'success': 'default',
      'warning': 'default',
      'error': 'destructive'
    };

    const variant = variantMap[args.type || 'info'] || 'default';

    // Afficher le toast
    toast({
      title: args.type === 'success' ? '✅ Success' :
             args.type === 'warning' ? '⚠️ Warning' :
             args.type === 'error' ? '❌ Error' :
             'ℹ️ Information',
      description: args.message,
      variant: variant,
      duration: (args.duration || 5) * 1000
    });

    // Si c'est une erreur, logger également dans la console
    if (args.type === 'error') {
      console.error('Notification error:', args.message);
    }

    return {
      success: true,
      message: 'Notification affichée'
    };

  } catch (error) {
    console.error('Error in show_notification:', error);
    return {
      success: false,
      message: 'Erreur lors de l\'affichage de la notification',
      error: error instanceof Error ? error.message : 'Error inconnue'
    };
  }
}

/**
 * Ouvrir un modal ou une vue spécifique
 */
export async function open_modal(args: {
  modal_type: 'create_project' | 'team_composition' | 'task_details' | 'meeting_details';
  context?: any;
}): Promise<NavigationResult> {
  try {
    // Cette fonction peut être étendue pour déclencher l'ouverture de modals spécifiques
    // En utilisant un système d'événements ou un store global
    
    switch (args.modal_type) {
      case 'create_project':
        // Déclencher l'ouverture du modal de création de projet
        window.dispatchEvent(new CustomEvent('open-create-project-modal'));
        break;
        
      case 'team_composition':
        // Naviguer vers ReactFlow
        return navigate_to({ destination: 'reactflow', project_id: args.context?.project_id });
        
      case 'task_details':
        if (args.context?.task_id) {
          window.dispatchEvent(new CustomEvent('open-task-modal', { 
            detail: { taskId: args.context.task_id } 
          }));
        }
        break;
        
      case 'meeting_details':
        if (args.context?.meeting_id) {
          window.dispatchEvent(new CustomEvent('open-meeting-modal', { 
            detail: { meetingId: args.context.meeting_id } 
          }));
        }
        break;
    }

    return {
      success: true,
      destination: args.modal_type,
      message: `Modal "${args.modal_type}" ouvert`
    };

  } catch (error) {
    console.error('Error in open_modal:', error);
    return {
      success: false,
      destination: args.modal_type,
      message: 'Erreur lors de l\'ouverture du modal',
      error: error instanceof Error ? error.message : 'Error inconnue'
    };
  }
}

/**
 * Mettre à jour l'état de l'interface
 */
export async function update_ui_state(args: {
  component: string;
  action: 'refresh' | 'show' | 'hide' | 'toggle';
  data?: any;
}): Promise<NotificationResult> {
  try {
    // Émettre un événement pour que les composants React puissent réagir
    window.dispatchEvent(new CustomEvent('ui-state-update', {
      detail: {
        component: args.component,
        action: args.action,
        data: args.data
      }
    }));

    // Actions spécifiques selon le composant
    switch (args.component) {
      case 'sidebar':
        if (args.action === 'toggle') {
          // Toggle sidebar visibility
          document.body.classList.toggle('sidebar-collapsed');
        }
        break;
        
      case 'theme':
        if (args.action === 'toggle') {
          // Toggle dark mode
          document.documentElement.classList.toggle('dark');
        }
        break;
        
      case 'Notifications':
        if (args.action === 'refresh') {
          // Rafraîchir les notifications
          window.dispatchEvent(new Event('refresh-notifications'));
        }
        break;
    }

    return {
      success: true,
      message: `Interface mise à jour: ${args.component} - ${args.action}`
    };

  } catch (error) {
    console.error('Error in update_ui_state:', error);
    return {
      success: false,
      message: 'Error lors de la mise à day de l\'interface',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}