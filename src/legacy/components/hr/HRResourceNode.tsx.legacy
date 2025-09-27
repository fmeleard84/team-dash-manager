import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { User, Clock, Bot, Users } from 'lucide-react';

interface HRResourceNodeData {
  profileName: string;
  seniority: 'junior' | 'intermediate' | 'senior';
  languages: string[];
  expertises: string[];
  calculatedPrice: number;
  languageNames?: string[];
  expertiseNames?: string[];
  is_ai?: boolean;
  is_team_member?: boolean;
  badge?: string;
}

interface HRResourceNodeProps {
  data: HRResourceNodeData;
  selected?: boolean;
}

const seniorityColors = {
  junior: 'bg-green-500/20 text-green-700 border-green-300',
  intermediate: 'bg-blue-500/20 text-blue-700 border-blue-300',
  senior: 'bg-purple-500/20 text-purple-700 border-purple-300',
};

const HRResourceNode = memo(({ data, selected }: HRResourceNodeProps) => {
  const isAI = data.is_ai;
  const isTeamMember = data.is_team_member;

  return (
    <div className={`
      relative min-w-[200px] border-2 rounded-lg p-3 shadow-md
      ${isAI 
        ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-purple-400' 
        : isTeamMember
        ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-400'
        : 'bg-card border-border'
      }
      ${selected ? 'shadow-lg border-primary' : ''}
      transition-all duration-200
    `} style={{ 
      pointerEvents: 'auto',
      opacity: 1,
      visibility: 'visible',
      zIndex: 10
    }}>
      {/* Handle du haut avec dégradé Ialla - AUGMENTÉ */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-6 !h-6 !border-2 !border-white !bg-gradient-to-r !from-blue-600 !to-purple-600 hover:!w-8 hover:!h-8 transition-all cursor-crosshair" 
        style={{ 
          top: -10,
          touchAction: 'none',
          pointerEvents: 'all'
        }}
      />
      
      {/* Badge pour les ressources spéciales */}
      {(isAI || isTeamMember) && (
        <div className={`absolute -top-2 -right-2 px-2 py-1 ${
          isAI 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
            : 'bg-blue-600'
        } text-white text-xs font-bold rounded-full`}>
          {isAI ? 'IA' : 'Équipe'}
        </div>
      )}
      
      {/* Header avec nom et séniorité/IA */}
      <div className="flex items-center gap-2 mb-2">
        {isAI ? (
          <Bot className="w-4 h-4 text-purple-600" />
        ) : isTeamMember ? (
          <Users className="w-4 h-4 text-blue-600" />
        ) : (
          <User className="w-4 h-4 text-primary" />
        )}
        <div className="flex-1">
          <div className="font-medium text-sm">{data.profileName}</div>
          {!isAI && !isTeamMember && (
            <Badge 
              className={`text-xs px-2 py-0 ${seniorityColors[data.seniority]}`}
              variant="outline"
            >
              {data.seniority}
            </Badge>
          )}
        </div>
      </div>

      {/* Prix */}
      <div className="flex items-center gap-1 mb-2">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-sm font-semibold text-primary">
          {data.calculatedPrice.toFixed(2)} €/mn
        </span>
      </div>

      {/* Langues et Expertises - uniquement pour les ressources humaines */}
      {!isAI && (
        <>
          {data.languageNames && data.languageNames.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Langues:</div>
              <div className="flex flex-wrap gap-1">
                {data.languageNames.map((language, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {language}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {data.expertiseNames && data.expertiseNames.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Expertises:</div>
              <div className="flex flex-wrap gap-1">
                {data.expertiseNames.map((expertise, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {expertise}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Message spécifique pour les IA */}
      {isAI && (
        <div className="text-xs text-purple-700 italic">
          Nécessite une connexion humaine
        </div>
      )}

      {/* Handle du bas avec dégradé Ialla - AUGMENTÉ */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-6 !h-6 !border-2 !border-white !bg-gradient-to-r !from-blue-600 !to-purple-600 hover:!w-8 hover:!h-8 transition-all cursor-crosshair" 
        style={{ 
          bottom: -10,
          touchAction: 'none',
          pointerEvents: 'all'
        }}
      />
    </div>
  );
});

HRResourceNode.displayName = 'HRResourceNode';

export default HRResourceNode;