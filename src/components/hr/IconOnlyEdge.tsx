import React, { FC, useState } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

const IconOnlyEdge: FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  source,
  target,
}) => {
  const [isIconHovered, setIsIconHovered] = useState(false);
  
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('🎯 Icon clicked! Opening popup for edge:', id);
    if (data?.onClick) {
      data.onClick(id, source, target);
    }
  };

  return (
    <>
      {/* Edge path - toujours violet clair, pas de hover */}
      <path
        id={id}
        style={{
          stroke: '#8B5CF6',
          strokeWidth: 3,
          fill: 'none',
          cursor: 'default',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Zone invisible pour que l'edge soit sélectionnable */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        style={{ cursor: 'default' }}
      />
      
      {/* Icône au milieu - SEULE zone interactive */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            zIndex: 1000,
          }}
          className="nodrag nopan"
        >
          <button
            style={{
              width: isIconHovered ? 48 : 40,
              height: isIconHovered ? 48 : 40,
              borderRadius: '50%',
              background: isIconHovered
                ? 'linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%)'
                : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              border: isIconHovered ? '3px solid white' : '2px solid white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: isIconHovered
                ? '0 10px 30px rgba(109, 40, 217, 0.5)'
                : '0 4px 15px rgba(139, 92, 246, 0.4)',
              padding: 0,
              outline: 'none',
              transform: isIconHovered ? 'scale(1.1)' : 'scale(1)',
            }}
            onMouseEnter={() => {
              console.log('🟢 Icon hover ENTER');
              setIsIconHovered(true);
            }}
            onMouseLeave={() => {
              console.log('🔴 Icon hover LEAVE');
              setIsIconHovered(false);
            }}
            onClick={handleIconClick}
            type="button"
            title="Cliquez pour voir les livrables"
          >
            <ArrowRightLeft
              size={isIconHovered ? 24 : 20}
              color="white"
              style={{ 
                transition: 'all 0.2s ease',
                pointerEvents: 'none'
              }}
            />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default IconOnlyEdge;