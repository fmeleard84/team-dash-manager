import React, { FC, useState, memo } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

// Mémoriser le composant pour éviter les re-renders inutiles
const CleanEdge: FC<EdgeProps> = memo(({
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

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🎯 Icon clicked for edge:', id);
    if (data?.onClick) {
      data.onClick(id, source, target);
    }
  };

  return (
    <>
      {/* Utiliser BaseEdge de ReactFlow pour l'edge */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd}
        style={{
          stroke: '#8B5CF6',
          strokeWidth: 3,
        }}
      />
      
      {/* Label avec icône */}
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
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isHovered
                ? 'linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%)'
                : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              border: '3px solid white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isHovered
                ? '0 10px 30px rgba(109, 40, 217, 0.5)'
                : '0 4px 15px rgba(139, 92, 246, 0.4)',
              padding: 0,
              outline: 'none',
              transition: 'all 0.2s',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            }}
            onMouseEnter={() => {
              console.log('Mouse enter icon');
              setIsHovered(true);
            }}
            onMouseLeave={() => {
              console.log('Mouse leave icon');
              setIsHovered(false);
            }}
            onClick={handleIconClick}
            type="button"
          >
            <ArrowRightLeft
              size={22}
              color="white"
              style={{ pointerEvents: 'none' }}
            />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

CleanEdge.displayName = 'CleanEdge';

export default CleanEdge;