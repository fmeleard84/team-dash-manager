import React, { FC, memo, useState } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
} from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';

const FinalWorkingEdge: FC<EdgeProps> = memo(({
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

  const handleClick = () => {
    console.log('✅ Edge button clicked!', id);
    if (data?.onClick) {
      data.onClick(id, source, target);
    }
  };

  return (
    <>
      {/* Edge line */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd}
        style={{
          stroke: '#8B5CF6',
          strokeWidth: 3,
        }}
      />
      
      {/* Interactive button - centered on edge */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            // Pas de pointerEvents ici pour ne pas bloquer
          }}
          className="nodrag nopan"
        >
          <div
            style={{
              width: isHovered ? 52 : 46,
              height: isHovered ? 52 : 46,
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
                ? '0 10px 30px rgba(109, 40, 217, 0.6)'
                : '0 4px 15px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.15s ease',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClick();
              }
            }}
          >
            <ArrowRightLeft
              size={isHovered ? 24 : 20}
              color="white"
              style={{ pointerEvents: 'none' }}
            />
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

FinalWorkingEdge.displayName = 'FinalWorkingEdge';

export default FinalWorkingEdge;