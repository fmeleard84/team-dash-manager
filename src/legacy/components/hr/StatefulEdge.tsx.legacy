import React, { FC, useState, useRef, useEffect } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

const StatefulEdge: FC<EdgeProps> = ({
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
  source,
  target,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const edgeRef = useRef<SVGGElement>(null);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Utiliser useEffect pour s'assurer que les événements sont bien attachés
  useEffect(() => {
    const edgeElement = edgeRef.current;
    if (!edgeElement) return;

    const handleMouseEnter = () => {
      console.log('🟢 Mouse ENTER on edge:', id);
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      console.log('🔴 Mouse LEAVE from edge:', id);
      setIsHovered(false);
    };

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('🎯 CLICK on edge:', id);
      
      if (data?.onClick) {
        data.onClick(id, source, target);
      }
    };

    // Attacher les événements
    edgeElement.addEventListener('mouseenter', handleMouseEnter);
    edgeElement.addEventListener('mouseleave', handleMouseLeave);
    edgeElement.addEventListener('click', handleClick);

    // Nettoyer les événements
    return () => {
      edgeElement.removeEventListener('mouseenter', handleMouseEnter);
      edgeElement.removeEventListener('mouseleave', handleMouseLeave);
      edgeElement.removeEventListener('click', handleClick);
    };
  }, [id, data, source, target]);

  return (
    <>
      <g ref={edgeRef} style={{ cursor: 'pointer' }}>
        {/* Edge path visible */}
        <path
          id={`${id}-path`}
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
        
        {/* Zone de détection élargie */}
        <path
          style={{
            strokeWidth: 30,
            fill: 'none',
            stroke: 'transparent',
            pointerEvents: 'stroke',
          }}
          d={edgePath}
        />
      </g>
      
      {/* Label avec icône */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 1000,
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
              position: 'relative',
            }}
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔵 Icon button clicked for edge:', id);
              if (data?.onClick) {
                data.onClick(id, source, target);
              }
            }}
            onMouseEnter={() => {
              console.log('🟣 Mouse enter icon');
              setIsHovered(true);
            }}
            onMouseLeave={() => {
              console.log('🟣 Mouse leave icon');
              setIsHovered(false);
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

export default StatefulEdge;