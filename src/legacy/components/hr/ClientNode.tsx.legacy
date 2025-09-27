import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Building2, Briefcase } from 'lucide-react';

interface ClientNodeProps {
  data: {
    label: string;
  };
}

const ClientNode = memo(({ data }: ClientNodeProps) => {
  return (
    <div className="relative min-w-[200px] bg-gradient-to-br from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-gray-800">Client</div>
          <div className="text-xs text-gray-600">Expression de besoin</div>
        </div>
      </div>
      
      <div className="mt-3 p-2 bg-white/50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Briefcase className="w-4 h-4 text-blue-600" />
          <span>Début du projet</span>
        </div>
      </div>
      
      {/* Handle du bas avec zone de clic PLUS GRANDE */}
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

ClientNode.displayName = 'ClientNode';

export default ClientNode;