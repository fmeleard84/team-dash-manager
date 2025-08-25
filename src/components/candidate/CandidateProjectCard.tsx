import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Euro, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Rocket,
  Target,
  Users,
  Briefcase,
  MapPin,
  Globe,
  TrendingUp,
  Eye,
  Sparkles,
  Loader2,
  Play
} from "lucide-react";
import { toast } from "sonner";

interface CandidateProjectCardProps {
  project: {
    id: string;
    title: string;
    description?: string;
    project_date: string;
    due_date?: string | null;
    client_budget?: number | null;
    status: string;
    profile_name?: string;
    seniority?: string;
    languages?: string[];
    expertises?: string[];
    calculated_price?: number;
    created_at?: string;
  };
  type: 'available' | 'accepted' | 'active' | 'completed';
  onAccept?: () => void;
  onDecline?: () => void;
  onViewDetails?: () => void;
  isProcessing?: boolean;
}

export const CandidateProjectCard = ({ 
  project, 
  type, 
  onAccept, 
  onDecline, 
  onViewDetails,
  isProcessing = false
}: CandidateProjectCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount?: number | null) => {
    if (!amount && amount !== 0) return '—';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateDuration = (startDate: string, endDate?: string | null) => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 7) {
      return `${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
    } else {
      const months = Math.round(diffInDays / 30);
      return `${months} mois`;
    }
  };

  const getTimeSince = (createdAt?: string) => {
    if (!createdAt) return "Nouvelle demande";
    
    const now = new Date();
    const created = new Date(createdAt);
    const diff = now.getTime() - created.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `Depuis ${days}j`;
    } else if (hours > 0) {
      return `Depuis ${hours}h`;
    } else if (minutes > 0) {
      return `Depuis ${minutes}min`;
    } else {
      return `À l'instant`;
    }
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'available':
        return {
          gradient: 'from-blue-600 to-purple-600',
          lightGradient: 'from-blue-50 to-purple-50',
          borderColor: 'border-blue-200',
          badge: { text: 'Nouvelle opportunité', icon: <Sparkles className="w-3 h-3" /> },
          showActions: true
        };
      case 'accepted':
        return {
          gradient: 'from-orange-500 to-amber-500',
          lightGradient: 'from-orange-50 to-amber-50',
          borderColor: 'border-orange-200',
          badge: { text: 'Accepté', icon: <CheckCircle2 className="w-3 h-3" /> },
          showActions: false
        };
      case 'active':
        return {
          gradient: 'from-green-500 to-emerald-500',
          lightGradient: 'from-green-50 to-emerald-50',
          borderColor: 'border-green-200',
          badge: { text: 'En cours', icon: <Play className="w-3 h-3" /> },
          showActions: false
        };
      case 'completed':
        return {
          gradient: 'from-gray-500 to-gray-600',
          lightGradient: 'from-gray-50 to-gray-100',
          borderColor: 'border-gray-200',
          badge: { text: 'Terminé', icon: <CheckCircle2 className="w-3 h-3" /> },
          showActions: false
        };
      default:
        return {
          gradient: 'from-blue-600 to-purple-600',
          lightGradient: 'from-blue-50 to-purple-50',
          borderColor: 'border-blue-200',
          badge: { text: 'Projet', icon: <Briefcase className="w-3 h-3" /> },
          showActions: false
        };
    }
  };

  const config = getTypeConfig();
  const duration = calculateDuration(project.project_date, project.due_date);

  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl border ${config.borderColor} shadow-lg`}>
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                className={`bg-gradient-to-r ${config.gradient} text-white border-0 flex items-center gap-1`}
              >
                {config.badge.icon}
                {config.badge.text}
              </Badge>
              {type === 'available' && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {getTimeSince(project.created_at)}
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{project.title}</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {project.description && (
          <div>
            <p className={`text-sm text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>
              {project.description}
            </p>
            {project.description.length > 100 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm font-medium text-blue-600 hover:text-purple-600 transition-colors mt-1"
              >
                {isExpanded ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </div>
        )}

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r ${config.lightGradient} border ${config.borderColor}`}>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${config.gradient} flex items-center justify-center text-white`}>
              <Euro className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Budget</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(project.client_budget)}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r ${config.lightGradient} border ${config.borderColor}`}>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${config.gradient} flex items-center justify-center text-white`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Début</p>
              <p className="text-sm font-semibold text-gray-900">{formatDate(project.project_date)}</p>
            </div>
          </div>
        </div>

        {/* Daily rate if available */}
        {project.calculated_price && (
          <div className={`flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-100`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600">Tarif journalier estimé</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(project.calculated_price)}/jour</p>
            </div>
            {duration && (
              <Badge variant="outline" className="text-xs">
                {duration}
              </Badge>
            )}
          </div>
        )}

        {/* Profile info */}
        {project.profile_name && (
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Poste recherché</span>
              </div>
              {project.seniority && (
                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 text-xs">
                  {project.seniority}
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900">{project.profile_name}</p>
          </div>
        )}

        {/* Skills and languages */}
        {(project.expertises?.length || project.languages?.length) && (
          <div className="space-y-2">
            {project.expertises && project.expertises.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" />
                {project.expertises.map((expertise, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline"
                    className="text-xs border-blue-200 text-blue-700"
                  >
                    {expertise}
                  </Badge>
                ))}
              </div>
            )}
            
            {project.languages && project.languages.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-600" />
                {project.languages.map((language, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline"
                    className="text-xs border-purple-200 text-purple-700"
                  >
                    {language}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {config.showActions ? (
            <>
              <Button
                onClick={onViewDetails}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Voir détails
              </Button>
              <Button
                onClick={onAccept}
                disabled={isProcessing}
                size="sm"
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accepter la mission
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={onViewDetails}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              Voir les détails du projet
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};