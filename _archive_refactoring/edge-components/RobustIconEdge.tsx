import React, { FC, useState, useRef, useEffect } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

const RobustIconEdge: FC<EdgeProps> = ({
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
  const [isIconHovered, setIsIconHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [clickCount, setClickCount] = useState(0);
  
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  // Utiliser useEffect pour capturer les événements de manière plus fiable
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleEnter = () => {
      console.log(`✅ [${new Date().toISOString()}] Icon ENTER`);
      setIsIconHovered(true);
    };

    const handleLeave = () => {
      console.log(`❌ [${new Date().toISOString()}] Icon LEAVE`);
      setIsIconHovered(false);
    };

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const newCount = clickCount + 1;
      setClickCount(newCount);
      console.log(`🎯 [${new Date().toISOString()}] Icon CLICK #${newCount} for edge:`, id);
      
      if (data?.onClick) {
        data.onClick(id, source, target);
      }
    };

    // Utiliser addEventListener pour plus de contrôle
    button.addEventListener('mouseenter', handleEnter);
    button.addEventListener('mouseleave', handleLeave);
    button.addEventListener('click', handleClick);
    
    // Ajouter aussi les événements pointer pour les écrans tactiles
    button.addEventListener('pointerenter', handleEnter);
    button.addEventListener('pointerleave', handleLeave);

    return () => {
      button.removeEventListener('mouseenter', handleEnter);
      button.removeEventListener('mouseleave', handleLeave);
      button.removeEventListener('click', handleClick);
      button.removeEventListener('pointerenter', handleEnter);
      button.removeEventListener('pointerleave', handleLeave);
    };
  }, [id, source, target, data, clickCount]);

  return (
    <>
      {/* Edge path simple sans interaction */}
      <path
        id={id}
        style={{
          stroke: '#8B5CF6',
          strokeWidth: 3,
          fill: 'none',
          pointerEvents: 'none', // Désactiver complètement les événements sur l'edge
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Icône au milieu - seule zone interactive */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none', // Le div parent ne capture pas les événements
            zIndex: 2000, // Z-index très élevé
          }}
          className="nodrag nopan"
        >
          <button
            ref={buttonRef}
            style={{
              width: isIconHovered ? 50 : 42,
              height: isIconHovered ? 50 : 42,
              borderRadius: '50%',
              background: isIconHovered
                ? 'linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%)'
                : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              border: isIconHovered ? '4px solid white' : '3px solid white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: isIconHovered
                ? '0 12px 35px rgba(109, 40, 217, 0.6), 0 0 0 8px rgba(139, 92, 246, 0.2)'
                : '0 4px 15px rgba(139, 92, 246, 0.4)',
              padding: 0,
              outline: 'none',
              transform: isIconHovered ? 'scale(1.15) translateZ(0)' : 'scale(1) translateZ(0)',
              pointerEvents: 'all', // Seul élément qui capture les événements
              position: 'relative',
              isolation: 'isolate', // Créer un nouveau contexte de stacking
            }}
            type="button"
            title={`Cliquez pour voir les livrables (clics: ${clickCount})`}
            aria-label="Voir les livrables entre ces ressources"
          >
            <ArrowRightLeft
              size={isIconHovered ? 26 : 22}
              color="white"
              style={{ 
                transition: 'all 0.2s ease',
                pointerEvents: 'none', // L'icône ne capture pas les événements
                position: 'relative',
                zIndex: 1,
              }}
            />
            {/* Indicateur visuel du hover */}
            {isIconHovered && (
              <div 
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  border: '2px solid rgba(109, 40, 217, 0.5)',
                  animation: 'pulse 1s infinite',
                  pointerEvents: 'none',
                }}
              />
            )}
          </button>
        </div>
      </EdgeLabelRenderer>
      
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default RobustIconEdge;