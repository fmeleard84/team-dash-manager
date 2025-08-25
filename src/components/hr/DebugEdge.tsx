import React, { FC, memo } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

const DebugEdge: FC<EdgeProps> = memo(({
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Fonction pour logger tous les événements
  const logEvent = (eventName: string, e: any) => {
    console.log(`🔍 ${eventName}:`, {
      id,
      target: e.target,
      currentTarget: e.currentTarget,
      bubbles: e.bubbles,
      cancelable: e.cancelable,
      defaultPrevented: e.defaultPrevented,
      timestamp: Date.now(),
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };

  return (
    <>
      {/* Edge simple */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd}
        style={{
          stroke: '#8B5CF6',
          strokeWidth: 3,
        }}
      />
      
      {/* Bouton de test avec TOUS les événements */}
      <EdgeLabelRenderer>
        <foreignObject
          x={labelX - 30}
          y={labelY - 30}
          width={60}
          height={60}
          style={{
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <div 
            style={{ 
              pointerEvents: 'all',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                border: '4px solid white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 25px rgba(139, 92, 246, 0.5)',
                padding: 0,
                outline: '3px solid red', // Bordure rouge pour debug
                position: 'relative',
                zIndex: 999999,
              }}
              // Tous les événements possibles pour debug
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                logEvent('CLICK', e);
                if (data?.onClick) {
                  data.onClick(id, source, target);
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                logEvent('MOUSE_DOWN', e);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                logEvent('MOUSE_UP', e);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                logEvent('POINTER_DOWN', e);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                logEvent('POINTER_UP', e);
              }}
              onMouseEnter={(e) => {
                logEvent('MOUSE_ENTER', e);
              }}
              onMouseLeave={(e) => {
                logEvent('MOUSE_LEAVE', e);
              }}
              onPointerEnter={(e) => {
                logEvent('POINTER_ENTER', e);
              }}
              onPointerLeave={(e) => {
                logEvent('POINTER_LEAVE', e);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                logEvent('TOUCH_START', e);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                logEvent('TOUCH_END', e);
              }}
              type="button"
              title="Zone de test - Cliquez ici"
            >
              <ArrowRightLeft
                size={24}
                color="white"
                style={{ pointerEvents: 'none' }}
              />
            </button>
          </div>
        </foreignObject>
      </EdgeLabelRenderer>
    </>
  );
});

DebugEdge.displayName = 'DebugEdge';

export default DebugEdge;