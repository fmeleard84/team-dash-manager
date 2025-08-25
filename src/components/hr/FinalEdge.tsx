import React, { FC, useState } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

const FinalEdge: FC<EdgeProps> = ({
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
  
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const handleClick = () => {
    console.log('✨✨✨ Edge clicked:', id);
    if (data?.onClick) {
      data.onClick(id, source, target);
    }
  };

  return (
    <>
      {/* Path visible */}
      <path
        id={id}
        style={{
          stroke: isHovered ? '#6D28D9' : '#8B5CF6',
          strokeWidth: isHovered ? 4 : 3,
          fill: 'none',
          transition: 'stroke 0.15s, stroke-width 0.15s',
          cursor: 'pointer',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Zone interactive transparente */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={25}
        stroke="rgba(0,0,0,0)"
        style={{ cursor: 'pointer' }}
        onPointerEnter={() => {
          console.log('🔹 Pointer enter:', id);
          setIsHovered(true);
        }}
        onPointerLeave={() => {
          console.log('🔸 Pointer leave:', id);
          setIsHovered(false);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      />
      
      {/* Icône au milieu */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
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
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              boxShadow: isHovered
                ? '0 8px 24px rgba(109, 40, 217, 0.4)'
                : '0 4px 12px rgba(139, 92, 246, 0.3)',
              padding: 0,
              outline: 'none',
              pointerEvents: 'all',
            }}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            onPointerDown={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            type="button"
          >
            <ArrowRightLeft
              size={isHovered ? 22 : 18}
              color="white"
              style={{ 
                transition: 'all 0.15s',
                pointerEvents: 'none'
              }}
            />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default FinalEdge;