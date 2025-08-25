import React, { FC, memo, useState } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
} from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';

const SimpleXyflowEdge: FC<EdgeProps> = memo(({
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
  const [isHovered, setIsHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Edge path */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd}
        style={{
          stroke: '#8B5CF6',
          strokeWidth: 3,
        }}
      />
      
      {/* Bouton centré */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            style={{
              width: isHovered ? 48 : 44,
              height: isHovered ? 48 : 44,
              borderRadius: '50%',
              background: isHovered 
                ? 'linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%)'
                : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              border: isHovered ? '4px solid white' : '3px solid white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isHovered 
                ? '0 8px 20px rgba(109, 40, 217, 0.5)'
                : '0 4px 15px rgba(139, 92, 246, 0.4)',
              padding: 0,
              outline: 'none',
              transition: 'all 0.2s ease',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              console.log('🎯 Edge button clicked!', id);
              if (data?.onClick) {
                data.onClick(id, source, target);
              }
            }}
            type="button"
            title="Voir les livrables"
          >
            <ArrowRightLeft
              size={isHovered ? 22 : 20}
              color="white"
              style={{ pointerEvents: 'none' }}
            />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

SimpleXyflowEdge.displayName = 'SimpleXyflowEdge';

export default SimpleXyflowEdge;