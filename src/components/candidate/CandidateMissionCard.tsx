import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Separator } from "@/components/ui/separator";
import { Award, Building, Calendar, Check, CheckCircle, DollarSign, Info, Languages, Loader2, Timer, X } from "lucide-react";

interface MissionRequest {
  id: string;
  project_title: string;
  project_description?: string;
  project_budget: number;
  client_name: string;
  profile_name: string;
  category_name: string;
  seniority: string;
  languages: string[];
  expertises: string[];
  calculated_price: number;
  start_date: string;
  end_date: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

interface CandidateMissionCardProps {
  request: MissionRequest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  processing: boolean;
  getStatusColor: (status: string) => string;
  getSeniorityColor: (seniority: string) => string;
  getTimeRemaining: (expiresAt: string) => string;
}

export function CandidateMissionCard({
  request,
  onAccept,
  onDecline,
  processing,
  getStatusColor,
  getSeniorityColor,
  getTimeRemaining
}: CandidateMissionCardProps) {
  return (
    <Card className="group w-full bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
      {/* Header avec gradient selon le statut */}
      <div className={`relative overflow-hidden ${
        request.status === 'accepted' 
          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
          : request.status === 'pending'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse'
            : request.status === 'declined'
              ? 'bg-gradient-to-r from-red-500 to-orange-500'
              : 'bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800'
      } p-4 text-white`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold">{request.project_title}</h3>
            <p className="text-sm text-white/90 mt-1">Par {request.client_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-white/30">
              {request.status === 'pending' ? 'En attente' : 
               request.status === 'accepted' ? 'Acceptée' :
               request.status === 'declined' ? 'Refusée' : 'Expirée'}
            </Badge>
            {request.status === 'pending' && (
              <Badge className="bg-orange-500/80 text-white border-orange-300/50 flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {getTimeRemaining(request.expires_at)}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <CardContent className="p-6 space-y-5">
        {/* Infos principales avec icônes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Tarif mission</p>
              <p className="font-semibold text-gray-900">{request.calculated_price.toLocaleString('fr-FR')}€/mn</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Début</p>
              <p className="font-semibold text-gray-900">{new Date(request.start_date).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>

        {/* Profil et séniorité */}
        <div className="space-y-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900">Profil recherché</span>
            </div>
            
            {/* Bouton info */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-blue-100">
                  <Info className="w-4 h-4 text-blue-600" />
                </Button>
              </DialogTrigger>
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{request.project_title}</h2>
                  <p className="text-gray-300">{request.category_name}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Description du projet</h4>
                    <p className="text-sm text-muted-foreground">
                      {request.project_description || 'Aucune description disponible.'}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Client:</span> {request.client_name}
                    </div>
                    <div>
                      <span className="font-medium">Budget total:</span> {request.project_budget.toLocaleString('fr-FR')}€
                    </div>
                    <div>
                      <span className="font-medium">Début:</span> {new Date(request.start_date).toLocaleDateString('fr-FR')}
                    </div>
                    <div>
                      <span className="font-medium">Fin:</span> {new Date(request.end_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              </div>
            </Dialog>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Award className="w-3 h-3" />
              {request.profile_name}
            </Badge>
            <Badge className={getSeniorityColor(request.seniority)}>
              {request.seniority.charAt(0).toUpperCase() + request.seniority.slice(1)}
            </Badge>
          </div>

          {/* Langues requises */}
          {request.languages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Langues requises</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {request.languages.map((lang, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-blue-50 border-blue-200">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Expertises requises */}
          {request.expertises.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Expertises requises</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {request.expertises.map((exp, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-purple-50 border-purple-200">
                    {exp}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {request.status === 'pending' && (
          <div className="flex gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
              onClick={() => onDecline(request.id)}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Refuser
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 transition-all duration-200"
              onClick={() => onAccept(request.id)}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Accepter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}