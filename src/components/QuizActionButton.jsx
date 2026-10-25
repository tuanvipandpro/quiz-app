import React from 'react';
import { Button, Tooltip } from 'antd';

// Visible labels remain on desktop; mobile keeps the accessible name and tooltip.
export default function QuizActionButton({ label, tooltip = label, children, className = '', ...props }) {
  return <Tooltip title={tooltip}>
    <span className={`quiz-action-slot${props.block ? ' quiz-action-slot-block' : ''}`}>
      <Button {...props} aria-label={label} title={typeof tooltip === 'string' ? tooltip : label}
        className={`quiz-action-button ${className}`}>
        <span className="quiz-action-label">{children ?? label}</span>
      </Button>
    </span>
  </Tooltip>;
}
