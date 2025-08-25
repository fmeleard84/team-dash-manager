import React from 'react';
import { BezierEdge, EdgeProps } from 'reactflow';

export default function StandardEdgeWithButton(props: EdgeProps) {
  const { id, source, target, data } = props;
  
  return (
    <BezierEdge
      {...props}
      label={
        <button
          style={{
            background: '#8B5CF6',
            border: '2px solid white',
            borderRadius: '50%',
            width: 30,
            height: 30,
            cursor: 'pointer',
            color: 'white',
            fontSize: 16,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => {
            e.stopPropagation();
            console.log('🎯 STANDARD EDGE BUTTON CLICKED!', id);
            if (data?.onClick) {
              data.onClick(id, source, target);
            }
          }}
        >
          ⇄
        </button>
      }
    />
  );
}