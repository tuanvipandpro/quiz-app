import React from 'react';
import { Alert, Button, Space, Spin } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { EXAM_HISTORY_ENABLED } from '../config/examHistoryConfig';
import { HISTORY_MESSAGES } from '../utils/examHistoryErrors.js';

const localCopy = {
  guest: 'Sign in to archive future exams. This result stays in this tab.',
  upload:
    'Unsaved quiz results stay in this tab. Save the quiz before starting a future exam to keep history.',
  older: 'This completed exam stays in this tab. New exams can be archived.',
  account: 'This result stays in its original account and tab.',
};
const permanent = ['HISTORY_SIZE', 'HISTORY_INVALID', 'HISTORY_SOURCE_CHANGED', 'HISTORY_CONFLICT'];
export default function ExamArchiveStatus({ state, onHistory, onSignIn }) {
  const { t } = useLanguage();
  if (!EXAM_HISTORY_ENABLED) return null;
  if (state.status === 'saving')
    return (
      <div className="exam-archive-status" role="status">
        <Spin size="small" /> {t('Saving exam to history…')}
      </div>
    );
  if (state.status === 'saved')
    return (
      <Alert
        className="exam-archive-status"
        showIcon
        type="success"
        role="status"
        message={t('Exam saved to history.')}
        action={
          <Button onClick={() => onHistory(state.attemptId)}>{t('View saved result')}</Button>
        }
      />
    );
  if (state.status === 'error' || state.status === 'deleted')
    return (
      <Alert
        className="exam-archive-status"
        showIcon
        role={state.status === 'deleted' ? 'status' : 'alert'}
        type={state.status === 'deleted' ? 'info' : 'error'}
        message={t(HISTORY_MESSAGES[state.error?.code] || HISTORY_MESSAGES.HISTORY_UNAVAILABLE)}
        description={t('The current result remains available in this tab.')}
        action={
          state.status === 'error' && (
            <Space wrap>
              {!permanent.includes(state.error?.code) && (
                <Button onClick={state.retry}>{t('Retry')}</Button>
              )}
              {state.error?.code === 'HISTORY_QUOTA' && (
                <Button onClick={() => onHistory()}>{t('Manage history')}</Button>
              )}
            </Space>
          )
        }
      />
    );
  return (
    <Alert
      className="exam-archive-status"
      type="info"
      showIcon
      message={t(localCopy[state.reason] || localCopy.older)}
      action={state.reason === 'guest' && <Button onClick={onSignIn}>{t('Sign in')}</Button>}
    />
  );
}
