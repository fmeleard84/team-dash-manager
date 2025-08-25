import React, { FC } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

const SimpleInteractiveEdge: FC<EdgeProps> = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isHovered = data?.isHovered || false;
  
  // Log pour debug
  if (isHovered) {
    console.log(`Edge ${id} is hovered:`, isHovered);
  }

  return (
    <>
      {/* Utiliser BaseEdge pour la gestion native des interactions */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={props.markerEnd} 
        style={{
          stroke: isHovered ? '#6D28D9' : '#8B5CF6',
          strokeWidth: isHovered ? 4 : 3,
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
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
              width: isHovered ? 42 : 36,
              height: isHovered ? 42 : 36,
              borderRadius: '50%',
              background: isHovered
                ? 'linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%)'
                : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: isHovered
                ? '0 8px 24px rgba(109, 40, 217, 0.4)'
                : '0 4px 12px rgba(139, 92, 246, 0.3)',
              outline: 'none',
              padding: 0,
            }}
            onClick={(e) => {
              console.log('🔴 Icon button clicked!');
              e.stopPropagation();
            }}
            type="button"
          >
            <ArrowRightLeft
              size={isHovered ? 22 : 18}
              color="white"
              style={{ 
                transition: 'all 0.3s ease',
                pointerEvents: 'none'
              }}
            />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default SimpleInteractiveEdge;