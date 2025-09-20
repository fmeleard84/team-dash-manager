import React, { FC, useState, useCallback } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
} from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';

const WorkingEdge: FC<EdgeProps> = (props) => {
  const {
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
  } = props;

  const [isHovered, setIsHovered] = useState(false);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = useCallback(() => {
    console.log('🎯🎯 Edge clicked!', id);
    if (data?.onClick) {
      data.onClick(id, source, target);
    }
  }, [data, id, source, target]);

  const onMouseEnter = useCallback(() => {
    console.log('➡️ Mouse enter:', id);
    setIsHovered(true);
  }, [id]);

  const onMouseLeave = useCallback(() => {
    console.log('⬅️ Mouse leave:', id);
    setIsHovered(false);
  }, [id]);

  return (
    <>
      <g 
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onEdgeClick}
        style={{ cursor: 'pointer' }}
      >
        {/* Utiliser BaseEdge de ReactFlow */}
        <BaseEdge 
          path={edgePath} 
          markerEnd={markerEnd}
          style={{
            stroke: isHovered ? '#6D28D9' : '#8B5CF6',
            strokeWidth: isHovered ? 4 : 3,
            transition: 'all 0.2s ease',
          }}
        />
        
        {/* Zone de clic invisible mais plus large */}
        <path
          d={edgePath}
          strokeWidth={20}
          stroke="transparent"
          fill="none"
          style={{ pointerEvents: 'stroke' }}
        />
      </g>
      
      {/* Icône au milieu */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: 'transparent',
            pointerEvents: 'all',
          }}
        >
          <div
            style={{
              width: isHovered ? 42 : 36,
              height: isHovered ? 42 : 36,
              borderRadius: '50%',
              background: isHovered
                ? 'linear-gradient(135deg, #6D28D9 0%, #5B21B6 100%)'
                : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: isHovered
                ? '0 8px 24px rgba(109, 40, 217, 0.4)'
                : '0 4px 12px rgba(139, 92, 246, 0.3)',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEdgeClick();
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <ArrowRightLeft
              size={isHovered ? 22 : 18}
              color="white"
              style={{ 
                transition: 'all 0.2s ease',
                pointerEvents: 'none'
              }}
            />
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default WorkingEdge;