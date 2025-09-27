import React, { FC, useState } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

const CustomBezierEdge: FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style = {},
  data,
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

  const handleMouseEnter = () => {
    console.log('🟢 Edge hover ENTER:', id);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    console.log('🔴 Edge hover LEAVE:', id);
    setIsHovered(false);
  };

  return (
    <>
      {/* Edge path visible */}
      <path
        id={id}
        style={{
          ...style,
          stroke: isHovered ? '#6D28D9' : '#8B5CF6',
          strokeWidth: isHovered ? 4 : 3,
          fill: 'none',
          transition: 'all 0.2s ease',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Zone interactive invisible */}
      <path
        style={{
          ...style,
          strokeWidth: 20,
          fill: 'none',
          stroke: 'transparent',
          cursor: 'pointer',
        }}
        d={edgePath}
        className="react-flow__edge-interaction"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          console.log('🎯 Edge clicked:', id);
          if (data?.onClick) {
            data.onClick(id);
          }
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
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔵 Icon clicked:', id);
              if (data?.onClick) {
                data.onClick(id);
              }
            }}
            type="button"
          >
            <ArrowRightLeft
              size={isHovered ? 22 : 18}
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

export default CustomBezierEdge;