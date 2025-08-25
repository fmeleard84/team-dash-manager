import React from 'react';
import { BezierEdge, EdgeProps } from 'reactflow';

export default function TestEdge(props: EdgeProps) {
  console.log('🔵 TestEdge rendering with props:', props);
  
  return (
    <BezierEdge
      {...props}
      label={
        <div 
          style={{
            padding: 10,
            background: 'red',
            color: 'white',
            cursor: 'pointer',
            fontSize: 20,
            fontWeight: 'bold',
          }}
          onClick={() => {
            console.log('🚨🚨🚨 RED BOX CLICKED!');
            alert('Edge clicked!');
          }}
        >
          CLICK ME
        </div>
      }
    />
  );
}