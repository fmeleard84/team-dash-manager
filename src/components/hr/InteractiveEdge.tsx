import React, { FC } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

const InteractiveEdge: FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  source,
  target,
  data,
}) => {
  const isHovered = data?.isHovered || false;
  
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('🎯🎯🎯 Edge/Icon clicked!', { id, source, target });
    
    // Créer et dispatcher un événement personnalisé
    const event = new CustomEvent('edge-clicked', {
      detail: { id, source, target },
      bubbles: true,
      cancelable: true
    });
    const dispatched = window.dispatchEvent(event);
    console.log('📨 Event dispatched:', dispatched);
  };

  return (
    <>
      {/* Edge principal visible */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isHovered ? '#6D28D9' : '#8B5CF6',
          strokeWidth: isHovered ? 4 : 3,
          fill: 'none',
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
        }}
      />
      
      {/* Zone de détection invisible mais interactive */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
        style={{
          stroke: 'transparent',
          cursor: 'pointer',
        }}
        onMouseEnter={() => {
          console.log('Mouse enter edge:', id);
          // Dispatch event pour mettre à jour l'edge au niveau parent
          const event = new CustomEvent('edge-hover', {
            detail: { id, hovered: true },
            bubbles: true,
            cancelable: true
          });
          window.dispatchEvent(event);
        }}
        onMouseLeave={() => {
          console.log('Mouse leave edge:', id);
          const event = new CustomEvent('edge-hover', {
            detail: { id, hovered: false },
            bubbles: true,
            cancelable: true
          });
          window.dispatchEvent(event);
        }}
        onClick={handleClick}
        pointerEvents="stroke"
      />
      
      {/* Label avec icône */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 1001,
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
              transition: 'all 0.3s ease',
              boxShadow: isHovered
                ? '0 8px 24px rgba(109, 40, 217, 0.4)'
                : '0 4px 12px rgba(139, 92, 246, 0.3)',
              padding: 0,
              outline: 'none',
            }}
            onClick={handleClick}
            onMouseEnter={() => {
              console.log('Mouse enter icon:', id);
              const event = new CustomEvent('edge-hover', {
                detail: { id, hovered: true },
                bubbles: true,
                cancelable: true
              });
              window.dispatchEvent(event);
            }}
            onMouseLeave={() => {
              console.log('Mouse leave icon:', id);
              const event = new CustomEvent('edge-hover', {
                detail: { id, hovered: false },
                bubbles: true,
                cancelable: true
              });
              window.dispatchEvent(event);
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

export default InteractiveEdge;