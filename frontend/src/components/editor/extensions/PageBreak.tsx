'use client';

import { Node, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';

/**
 * PageBreak Component: A non-editable physical gap between A4 sheets.
 * This is an 'atom' node, meaning it acts as a single, indivisible unit.
 * The 'isolating' property ensures the cursor cannot enter the gap and 
 * text cannot be typed "between" pages.
 */
const PageBreakComponent = () => {
  return (
    <NodeViewWrapper className="page-break-wrapper">
      <div 
        className="page-break-gap"
        style={{
          height: '48px',
          margin: '0 -1in', // Burst through the editor padding
          backgroundColor: '#cbd5e1', // Matches workspace-bg
          position: 'relative',
          pointerEvents: 'none',
          userSelect: 'none',
          boxShadow: 'inset 0 10px 10px -10px rgba(0, 0, 0, 0.1), inset 0 -10px 10px -10px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div 
          className="page-number-label"
          style={{
            position: 'absolute',
            right: '2rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '11px',
            fontWeight: 800,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            opacity: 0.8,
            pointerEvents: 'none'
          }}
        >
          Page Gap
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: false,
  draggable: false,
  isolating: true,

  parseHTML() {
    return [
      { tag: 'div[data-type="page-break"]' },
      { tag: 'hr.page-break' },
    ];
  },

  renderHTML() {
    return ['div', { 'data-type': 'page-break', class: 'page-break' }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakComponent, {
      as: 'div',
    });
  },
});
