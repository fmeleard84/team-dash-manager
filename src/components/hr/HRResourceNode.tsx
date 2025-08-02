import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { User, Clock } from 'lucide-react';

interface HRResourceNodeData {
  id: string;
  profileName: string;
  seniority: 'junior' | 'intermediate' | 'senior';
  languages: string[];
  expertises: string[];
  calculatedPrice: number;
  selected?: boolean;
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
  return (
    <div className={`
      min-w-[200px] bg-card border-2 rounded-lg p-3 shadow-md
      ${selected ? 'border-primary shadow-lg' : 'border-border'}
      transition-all duration-200
    `}>
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      
      {/* Header avec nom et séniorité */}
      <div className="flex items-center gap-2 mb-2">
        <User className="w-4 h-4 text-primary" />
        <div className="flex-1">
          <div className="font-medium text-sm">{data.profileName}</div>
          <Badge 
            className={`text-xs px-2 py-0 ${seniorityColors[data.seniority]}`}
            variant="outline"
          >
            {data.seniority}
          </Badge>
        </div>
      </div>

      {/* Prix */}
      <div className="flex items-center gap-1 mb-2">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-sm font-semibold text-primary">
          {data.calculatedPrice.toFixed(2)} €/h
        </span>
      </div>

      {/* Langues */}
      {data.languages.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-muted-foreground mb-1">Langues:</div>
          <div className="flex flex-wrap gap-1">
            {data.languages.slice(0, 3).map((lang, index) => (
              <Badge key={index} variant="secondary" className="text-xs py-0 px-1">
                {lang}
              </Badge>
            ))}
            {data.languages.length > 3 && (
              <Badge variant="secondary" className="text-xs py-0 px-1">
                +{data.languages.length - 3}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Expertises */}
      {data.expertises.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Expertises:</div>
          <div className="flex flex-wrap gap-1">
            {data.expertises.slice(0, 2).map((exp, index) => (
              <Badge key={index} variant="outline" className="text-xs py-0 px-1">
                {exp}
              </Badge>
            ))}
            {data.expertises.length > 2 && (
              <Badge variant="outline" className="text-xs py-0 px-1">
                +{data.expertises.length - 2}
              </Badge>
            )}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
});

HRResourceNode.displayName = 'HRResourceNode';

export default HRResourceNode;