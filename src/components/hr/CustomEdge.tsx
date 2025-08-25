import React, { useState, useMemo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  source,
  target,
}: EdgeProps) => {
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
    console.log('Edge hover ENTER:', id);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    console.log('Edge hover LEAVE:', id);
    setIsHovered(false);
  };

  const handleIconClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    console.log('Icon clicked!', id);
    console.log('Source:', source, 'Target:', target);
    
    // Dispatcher un événement personnalisé simple
    const customEvent = new CustomEvent('edgeIconClick', {
      detail: { 
        id, 
        source: source || id.split('-')[0], 
        target: target || id.split('-').slice(1).join('-')
      }
    });
    window.dispatchEvent(customEvent);
  };

  // Style dynamique pour l'edge
  const dynamicEdgeStyle = useMemo(() => ({
    ...style,
    stroke: isHovered ? '#6D28D9' : '#8B5CF6',
    strokeWidth: isHovered ? 6 : 4,
    transition: 'stroke-width 0.2s ease, stroke 0.2s ease',
  }), [isHovered, style]);

  // Style pour l'icône
  const iconContainerStyle = useMemo(() => ({
    position: 'absolute' as const,
    transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: isHovered ? 40 : 32,
    height: isHovered ? 40 : 32,
    background: isHovered 
      ? 'linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%)' 
      : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    pointerEvents: 'all' as const,
    boxShadow: isHovered 
      ? '0 6px 20px rgba(109, 40, 217, 0.5)' 
      : '0 2px 8px rgba(139, 92, 246, 0.3)',
    zIndex: 1000,
  }), [isHovered, labelX, labelY]);

  return (
    <>
      {/* Edge principal avec style dynamique */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={dynamicEdgeStyle}
      />
      
      {/* Zone de détection pour hover ET clic */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleIconClick}
        style={{ 
          cursor: 'pointer',
          pointerEvents: 'stroke'
        }}
      />
      
      {/* Icône cliquable au centre */}
      <EdgeLabelRenderer>
        <div
          style={iconContainerStyle}
          className="nodrag nopan"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleIconClick}
        >
          <ArrowRightLeft 
            size={isHovered ? 22 : 18} 
            color="white"
            style={{ transition: 'all 0.2s ease' }}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;