import React, { FC, useState, memo, useRef, useLayoutEffect } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

const FixedEdge: FC<EdgeProps> = memo(({
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Utiliser useLayoutEffect pour attacher les événements après le rendu
  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    let hoverTimeout: NodeJS.Timeout;

    const handleMouseEnter = () => {
      clearTimeout(hoverTimeout);
      console.log('✅ Mouse ENTER icon');
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      // Petit délai pour éviter les flickers
      hoverTimeout = setTimeout(() => {
        console.log('❌ Mouse LEAVE icon');
        setIsHovered(false);
      }, 50);
    };

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('🎯 Icon CLICKED!', id);
      if (data?.onClick) {
        data.onClick(id, source, target);
      }
    };

    // Utiliser capture phase pour garantir la réception des événements
    button.addEventListener('mouseenter', handleMouseEnter, true);
    button.addEventListener('mouseleave', handleMouseLeave, true);
    button.addEventListener('click', handleClick, true);
    
    // Ajouter aussi touchstart pour mobile
    button.addEventListener('touchstart', handleClick, true);

    return () => {
      clearTimeout(hoverTimeout);
      button.removeEventListener('mouseenter', handleMouseEnter, true);
      button.removeEventListener('mouseleave', handleMouseLeave, true);
      button.removeEventListener('click', handleClick, true);
      button.removeEventListener('touchstart', handleClick, true);
    };
  }, [id, source, target, data]);

  return (
    <>
      {/* Edge de base */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd}
        style={{
          stroke: '#8B5CF6',
          strokeWidth: 3,
          pointerEvents: 'none',
        }}
      />
      
      {/* Icône interactive */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            zIndex: 9999,
          }}
        >
          <button
            ref={buttonRef}
            style={{
              width: isHovered ? 50 : 44,
              height: isHovered ? 50 : 44,
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
                ? '0 12px 35px rgba(109, 40, 217, 0.6)'
                : '0 4px 15px rgba(139, 92, 246, 0.4)',
              padding: 0,
              outline: 'none',
              transition: 'all 0.15s ease',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
              position: 'relative',
              zIndex: 9999,
              pointerEvents: 'all',
            }}
            type="button"
            title="Cliquez pour voir les livrables"
          >
            <ArrowRightLeft
              size={isHovered ? 24 : 20}
              color="white"
              style={{ pointerEvents: 'none' }}
            />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

FixedEdge.displayName = 'FixedEdge';

export default FixedEdge;