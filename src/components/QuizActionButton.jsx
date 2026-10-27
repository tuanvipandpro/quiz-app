import React from 'react';
import { Button, Tooltip } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';

export default function QuizActionButton({
  label,
  tooltip = label,
  children,
  className = '',
  ...props
}) {
  const { t } = useLanguage();
  const translatedLabel = t(label);
  const translatedTooltip = typeof tooltip === 'string' ? t(tooltip) : tooltip;
  return (
    <Tooltip title={translatedTooltip}>
      <span className={`quiz-action-slot${props.block ? ' quiz-action-slot-block' : ''}`}>
        <Button
          {...props}
          aria-label={translatedLabel}
          className={`quiz-action-button ${className}`}
        >
          <span className="quiz-action-label">
            {typeof children === 'string' ? t(children) : (children ?? translatedLabel)}
          </span>
        </Button>
      </span>
    </Tooltip>
  );
}
