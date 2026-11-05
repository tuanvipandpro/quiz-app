import React, { useEffect, useRef } from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';

export default function StudyNavigation({
  label,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  explanation,
  timer,
}) {
  const { t } = useLanguage();
  const dockRef = useRef(null);
  useEffect(() => {
    const root = document.documentElement;
    const dock = dockRef.current;
    if (!dock) return;
    let active = true;
    const measure = () => {
      if (!active || !dock.isConnected) return;
      root.style.setProperty('--study-dock-height', `${dock.getBoundingClientRect().height}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    measure();
    return () => {
      active = false;
      observer.disconnect();
      root.style.removeProperty('--study-dock-height');
    };
  }, []);
  return (
    <div ref={dockRef} className="study-navigation-bar" role="group" aria-label={label}>
      {timer}
      <div className={'study-navigation-actions' + (explanation ? ' has-explain' : '')}>
        <Button
          icon={<ArrowLeftOutlined aria-hidden="true" />}
          aria-label={t('Previous')}
          disabled={previousDisabled}
          onClick={onPrevious}
        >
          <span className="study-wide-label">{t('Previous')}</span>
          <span className="study-compact-label" aria-hidden="true">
            {t('Prev')}
          </span>
        </Button>
        {explanation && (
          <Button
            icon={<QuestionCircleOutlined aria-hidden="true" />}
            onClick={() => explanation.explain()}
            loading={explanation.loading}
            ref={explanation.triggerRef}
          >
            {t('Explain')}
          </Button>
        )}
        <Button
          type="primary"
          icon={<ArrowRightOutlined aria-hidden="true" />}
          iconPosition="end"
          aria-label={t('Next question')}
          disabled={nextDisabled}
          onClick={onNext}
        >
          <span className="study-wide-label">{t('Next question')}</span>
          <span className="study-compact-label" aria-hidden="true">
            {t('Next')}
          </span>
        </Button>
      </div>
    </div>
  );
}
