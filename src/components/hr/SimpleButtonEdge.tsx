import React, { FC, memo } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
} from 'reactflow';
import { ArrowRightLeft } from 'lucide-react';

const SimpleButtonEdge: FC<EdgeProps> = memo(({
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
      
      {/* Bouton au milieu - style fixe sans hover */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="edge-label-button nodrag nopan"
        >
          <button
            className="edge-icon-button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('🎯 Button clicked!', id);
              if (data?.onClick) {
                data.onClick(id, source, target);
              }
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              console.log('👇 Pointer down on button');
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              console.log('👆 Pointer up on button');
            }}
            type="button"
            title="Cliquez pour voir les livrables"
          >
            <ArrowRightLeft
              size={20}
              color="white"
              style={{ pointerEvents: 'none' }}
            />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

SimpleButtonEdge.displayName = 'SimpleButtonEdge';

export default SimpleButtonEdge;