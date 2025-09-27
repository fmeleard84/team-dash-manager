/**
 * Module NOTIFICATIONS - Composant ModularNotificationCenter
 *
 * Centre de notification moderne et complet.
 * Basé sur la logique métier existante de NotificationCenter.tsx.
 *
 * Fonctionnalités:
 * - Interface moderne avec glassmorphism
 * - Gestion complète des notifications (général + événements)
 * - Actions contextuelles (accepter/refuser, archiver, marquer lu)
 * - Support real-time via hook modular
 * - Métadonnées riches selon le type de notification
 * - Responsive et accessible
 * - Intégration parfaite avec le design system
 * - Animations fluides et feedback utilisateur
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/ui/components/button';
import { Badge } from '@/ui/components/badge';
import { Card, CardContent } from '@/ui/components/card';
import { ScrollArea } from '@/ui/components/scroll-area';
import { Separator } from '@/ui/components/separator';
import {
  Bell,
  MessageSquare,
  Star,
  FileText,
  Briefcase,
  Users,
  AlertTriangle,
  Play,
  Archive,
  Eye,
  ExternalLink,
  Calendar,
  MapPin,
  Video,
  Trash2,
  XCircle,
  RotateCcw,
  Filter,
  Settings,
  Check,
  X,
  Clock,
  TrendingUp,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useNotifications } from '../hooks';
import type {
  Notification,
  NotificationFilters,
  ModularNotificationCenterProps,
  NotificationItemProps,
  NotificationStatsProps
} from '../types';

// ==========================================
// UTILITAIRES DE STYLE ET ICONS
// ==========================================

/**
 * Retourne l'icône appropriée selon le type de notification
 */
const getNotificationIcon = (type: string) => {
  const iconProps = { className: "w-4 h-4" };

  const iconMap = {
    task_rating: <Star {...iconProps} className="text-yellow-500" />,
    new_message: <MessageSquare {...iconProps} className="text-blue-500" />,
    card_assigned: <FileText {...iconProps} className="text-purple-500" />,
    new_project: <Briefcase {...iconProps} className="text-green-500" />,
    project_started: <Play {...iconProps} className="text-green-600" />,
    event_invitation: <Calendar {...iconProps} className="text-orange-500" />,
    team_complete: <Users {...iconProps} className="text-emerald-500" />,
    team_incomplete: <Users {...iconProps} className="text-orange-400" />,
    project_archived: <Archive {...iconProps} className="text-blue-600" />,
    project_unarchived: <RotateCcw {...iconProps} className="text-green-600" />,
    project_deleted: <Trash2 {...iconProps} className="text-red-600" />,
    project_cancelled: <XCircle {...iconProps} className="text-orange-600" />,
    system_alert: <AlertTriangle {...iconProps} className="text-amber-500" />,
    mission_request: <Briefcase {...iconProps} className="text-indigo-500" />,
    mission_accepted: <Check {...iconProps} className="text-green-500" />,
    mission_declined: <X {...iconProps} className="text-red-500" />,
    qualification_completed: <Zap {...iconProps} className="text-purple-600" />,
    profile_updated: <Settings {...iconProps} className="text-gray-500" />
  };

  return iconMap[type as keyof typeof iconMap] || <Bell {...iconProps} className="text-primary" />;
};

/**
 * Retourne la couleur de priorité
 */
const getPriorityColor = (priority: string) => {
  const colorMap = {
    urgent: 'bg-gradient-to-r from-red-500 to-red-600',
    high: 'bg-gradient-to-r from-orange-500 to-orange-600',
    medium: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    low: 'bg-gradient-to-r from-green-500 to-green-600'
  };

  return colorMap[priority as keyof typeof colorMap] || 'bg-gradient-to-r from-gray-500 to-gray-600';
};

/**
 * Retourne le libellé du type de notification
 */
const getTypeLabel = (type: string) => {
  const labelMap = {
    task_rating: 'Note reçue',
    new_message: 'Nouveau message',
    card_assigned: 'Tâche assignée',
    new_project: 'Nouveau projet',
    project_started: 'Projet démarré',
    event_invitation: 'Invitation événement',
    mission_request: 'Demande de mission',
    mission_accepted: 'Mission acceptée',
    mission_declined: 'Mission refusée',
    team_complete: 'Équipe complète',
    team_incomplete: 'Équipe incomplète',
    project_archived: 'Projet archivé',
    project_unarchived: 'Projet réactivé',
    project_deleted: 'Projet supprimé',
    project_cancelled: 'Projet annulé',
    system_alert: 'Alerte système',
    qualification_completed: 'Qualification terminée',
    profile_updated: 'Profil mis à jour'
  };

  return labelMap[type as keyof typeof labelMap] || 'Notification';
};

/**
 * Formate le temps relatif
 */
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'À l\'instant';
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
  if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;

  const days = Math.floor(diffInMinutes / 1440);
  return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
};

// ==========================================
// COMPOSANT STATISTIQUES
// ==========================================

const NotificationStats: React.FC<NotificationStatsProps> = ({ stats }) => {
  if (!stats || stats.total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-4 gap-3 mb-4"
    >
      <div className="text-center p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="text-lg font-bold text-primary">{stats.total}</div>
        <div className="text-xs text-muted-foreground">Total</div>
      </div>

      <div className="text-center p-3 rounded-xl bg-gradient-to-br from-orange/10 to-orange/5 border border-orange/20">
        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.unread}</div>
        <div className="text-xs text-muted-foreground">Non lues</div>
      </div>

      <div className="text-center p-3 rounded-xl bg-gradient-to-br from-red/10 to-red/5 border border-red/20">
        <div className="text-lg font-bold text-red-600 dark:text-red-400">{stats.byPriority.urgent + stats.byPriority.high}</div>
        <div className="text-xs text-muted-foreground">Urgentes</div>
      </div>

      <div className="text-center p-3 rounded-xl bg-gradient-to-br from-green/10 to-green/5 border border-green/20">
        <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.byStatus.read}</div>
        <div className="text-xs text-muted-foreground">Lues</div>
      </div>
    </motion.div>
  );
};

// ==========================================
// COMPOSANT ITEM NOTIFICATION
// ==========================================

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onArchive,
  onAcceptEvent,
  onDeclineEvent,
  showActions = true
}) => {
  const metadata = notification.metadata || {};

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`
        relative overflow-hidden transition-all duration-300
        ${notification.status === 'unread'
          ? 'border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/10'
          : 'hover:shadow-md'
        }
        hover:scale-[1.01] hover:shadow-lg
      `}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Indicateur de priorité avec gradient */}
            <div className={`w-3 h-3 rounded-full mt-2 shadow-lg ${getPriorityColor(notification.priority)}`} />

            <div className="flex-1 min-w-0">
              {/* Header avec titre et badge */}
              <div className="flex items-center gap-2 mb-2">
                {getNotificationIcon(notification.type)}
                <h4 className={`text-sm font-semibold truncate flex-1 ${
                  notification.status === 'unread'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}>
                  {notification.title}
                </h4>
                <Badge
                  variant={notification.status === 'unread' ? 'default' : 'outline'}
                  className="text-xs shrink-0"
                >
                  {getTypeLabel(notification.type)}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(notification.createdAt)}
                </div>
              </div>

              {/* Message principal */}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {notification.message}
              </p>

              {/* Métadonnées spécifiques */}
              {metadata && (
                <div className="text-xs text-muted-foreground mb-3 space-y-1.5 pl-4 border-l-2 border-muted">
                  {metadata.project_name && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3 h-3 text-green-500" />
                      <span className="font-medium">Projet:</span>
                      <span className="text-foreground">{metadata.project_name}</span>
                    </div>
                  )}

                  {metadata.rating && (
                    <div className="flex items-center gap-2">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="font-medium">Note:</span>
                      <span className="text-foreground font-medium">{metadata.rating}/5 étoiles</span>
                    </div>
                  )}

                  {metadata.sender_name && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 text-blue-500" />
                      <span className="font-medium">De:</span>
                      <span className="text-foreground">{metadata.sender_name}</span>
                    </div>
                  )}

                  {metadata.card_title && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-purple-500" />
                      <span className="font-medium">Tâche:</span>
                      <span className="text-foreground">{metadata.card_title}</span>
                    </div>
                  )}

                  {/* Métadonnées événement */}
                  {notification.type === 'event_invitation' && (
                    <>
                      {metadata.eventDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-orange-500" />
                          <span className="font-medium">Date:</span>
                          <span className="text-foreground">
                            {format(new Date(metadata.eventDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </span>
                        </div>
                      )}
                      {metadata.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-green-500" />
                          <span className="font-medium">Lieu:</span>
                          <span className="text-foreground">{metadata.location}</span>
                        </div>
                      )}
                      {metadata.videoUrl && (
                        <div className="flex items-center gap-2">
                          <Video className="w-3 h-3 text-indigo-500" />
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">
                            Visio disponible
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Actions selon le type et permissions */}
              {showActions && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Actions d'événement */}
                  {notification.actions?.length > 0 && (
                    <>
                      {notification.actions.map((action) => (
                        <Button
                          key={action.id}
                          size="sm"
                          variant={action.type === 'primary' ? 'default' : 'outline'}
                          onClick={() => {
                            if (action.action === 'accept_event' && onAcceptEvent) {
                              onAcceptEvent(notification.id);
                            } else if (action.action === 'decline_event' && onDeclineEvent) {
                              onDeclineEvent(notification.id);
                            }
                          }}
                          className={`h-7 px-3 text-xs ${
                            action.type === 'primary'
                              ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                              : ''
                          }`}
                        >
                          {action.type === 'primary' ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <X className="w-3 h-3 mr-1" />
                          )}
                          {action.label}
                        </Button>
                      ))}
                    </>
                  )}

                  {/* Action marquer comme lu */}
                  {notification.status === 'unread' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkAsRead(notification.id)}
                      className="h-7 px-3 text-xs hover:bg-primary/10"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Marquer lu
                    </Button>
                  )}

                  {/* Action archiver */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onArchive(notification.id)}
                    className="h-7 px-3 text-xs text-muted-foreground hover:bg-muted/50"
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    Archiver
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================

export const ModularNotificationCenter: React.FC<ModularNotificationCenterProps> = ({
  filters,
  sorting,
  showStats = true,
  showHeader = true,
  maxHeight = 'h-[500px]',
  className = '',
  onNotificationClick,
  autoRefresh = true
}) => {
  const {
    notifications,
    loading,
    error,
    stats,
    unreadCount,
    hasNew,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    acceptEvent,
    declineEvent,
    refetch
  } = useNotifications({
    filters,
    sorting,
    autoRefresh,
    realTimeEnabled: true
  });

  // Mémorisation des données calculées
  const displayNotifications = useMemo(() => {
    return notifications.slice(0, 50); // Limiter l'affichage pour les performances
  }, [notifications]);

  // Gestion du loading
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-32 ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  // Gestion des erreurs
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-32 ${className}`}>
        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          className="mt-2 text-xs"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-4 ${className}`}
    >
      {/* Header avec statistiques */}
      {showHeader && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <motion.h3
              className="font-bold text-lg flex items-center gap-2"
              animate={hasNew ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <Bell className={`w-5 h-5 ${hasNew ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
              Centre de notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  {unreadCount}
                </Badge>
              )}
            </motion.h3>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs hover:bg-primary/10"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Tout marquer lu
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {showStats && <NotificationStats stats={stats} />}
          <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      )}

      {/* Liste des notifications */}
      {displayNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          </motion.div>
          <p className="text-muted-foreground mb-2">Aucune notification</p>
          <p className="text-xs text-muted-foreground/70">
            Les nouvelles notifications apparaîtront ici
          </p>
        </motion.div>
      ) : (
        <ScrollArea className={maxHeight}>
          <motion.div className="space-y-3 pr-4">
            <AnimatePresence>
              {displayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onArchive={archiveNotification}
                  onAcceptEvent={acceptEvent}
                  onDeclineEvent={declineEvent}
                  onClick={onNotificationClick}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </ScrollArea>
      )}
    </motion.div>
  );
};

// Export du composant principal et des alias
export default ModularNotificationCenter;