import React from 'react';
import { Statistic, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';

export default function ExamTimer({ deadline }) {
  const { t } = useLanguage();
  return (
    <div className="exam-timer" role="timer" aria-label={t('Time remaining')}>
      <Typography.Text type="secondary">
        <ClockCircleOutlined aria-hidden="true" /> {t('Time remaining')}
      </Typography.Text>
      <Statistic.Timer type="countdown" value={deadline} format="HH:mm:ss" />
    </div>
  );
}
