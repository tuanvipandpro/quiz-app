import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Radio, Select, Typography } from 'antd';
import { PlayCircleOutlined, FormOutlined, ReadOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { EXAM_FEEDBACK_MODES, getExamFeedbackMode } from '../data/examModes';

const { Title, Text, Paragraph } = Typography;

export default function QuizMode({
  onSelectMode,
  onModeChange,
  totalQuestions,
  quickSummary = null,
  initialMode = 'practice',
  hasExamDraft = false,
  examDraftCount = null,
  examDraftFeedbackMode,
}) {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState(initialMode);
  useEffect(() => {
    setSelectedMode(initialMode === 'summary' && !quickSummary ? 'practice' : initialMode);
  }, [initialMode, quickSummary]);
  const [time, setTime] = useState(60);
  const [count, setCount] = useState(Math.min(50, totalQuestions));
  const [feedbackMode, setFeedbackMode] = useState(() => getExamFeedbackMode().id);
  const counts =
    totalQuestions < 50
      ? [totalQuestions]
      : [50, 60, 70, 80].filter((value) => value <= totalQuestions);
  const modes = [
    {
      id: 'practice',
      label: 'Practice',
      description: 'Learn with instant feedback.',
      icon: <PlayCircleOutlined aria-hidden="true" />,
    },
    {
      id: 'exam',
      label: 'Mock exam',
      description: 'Answer random questions against the clock.',
      icon: <FormOutlined aria-hidden="true" />,
    },
    ...(quickSummary
      ? [
          {
            id: 'summary',
            label: 'Quick Summary',
            description: 'Review key concepts and common traps.',
            icon: <ReadOutlined aria-hidden="true" />,
          },
        ]
      : []),
  ];
  return (
    <Card className="quiz-mode-picker">
      <Title level={2}>{t('Choose how to study')}</Title>
      <Radio.Group
        role="radiogroup"
        value={selectedMode}
        onChange={(event) => {
          setSelectedMode(event.target.value);
          onModeChange?.(event.target.value);
        }}
        className="mode-options"
        aria-label={t('Choose how to study')}
      >
        {modes.map((mode) => (
          <Radio.Button key={mode.id} value={mode.id}>
            {mode.icon}
            <span>
              <strong>{t(mode.label)}</strong>
              <small>{t(mode.description)}</small>
            </span>
          </Radio.Button>
        ))}
      </Radio.Group>
      {selectedMode === 'exam' && (
        <>
          <div className="quiz-exam-fields">
            <label>
              {t('Questions')}
              <Select
                aria-label={t('Questions')}
                value={count}
                onChange={setCount}
                options={counts.map((value) => ({
                  value,
                  label: t('{count} questions', { count: value }),
                }))}
              />
            </label>
            <label>
              {t('Time limit')}
              <Select
                aria-label={t('Time limit')}
                value={time}
                onChange={setTime}
                options={[60, 120].map((value) => ({
                  value,
                  label: t('{count} minutes', { count: value }),
                }))}
              />
            </label>
          </div>
          <fieldset
            className="exam-feedback-picker"
            role="radiogroup"
            aria-labelledby="exam-feedback-label"
          >
            <legend id="exam-feedback-label">{t('Exam mode')}</legend>
            <div className="exam-feedback-options">
              {EXAM_FEEDBACK_MODES.map((mode) => (
                <label
                  key={mode.id}
                  className={
                    'exam-feedback-option' + (feedbackMode === mode.id ? ' is-selected' : '')
                  }
                >
                  <input
                    type="radio"
                    name="exam-feedback"
                    value={mode.id}
                    checked={feedbackMode === mode.id}
                    onChange={() => setFeedbackMode(mode.id)}
                    aria-labelledby={`exam-feedback-${mode.id}-label`}
                    aria-describedby={`exam-feedback-${mode.id}-hint`}
                  />
                  <span>
                    <strong id={`exam-feedback-${mode.id}-label`}>{t(mode.label)}</strong>
                    <small id={`exam-feedback-${mode.id}-hint`}>{t(mode.description)}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {hasExamDraft && (
            <Alert
              type="info"
              showIcon
              message={t('Saved exam: {mode} · {count} questions. The timer keeps running.', {
                mode: t(getExamFeedbackMode(examDraftFeedbackMode).label),
                count: examDraftCount,
              })}
              description={t(
                'Resume keeps your saved settings. These choices apply to a new exam.'
              )}
            />
          )}
        </>
      )}
      <div className="quiz-mode-start">
        <Text type="secondary">
          {selectedMode === 'exam'
            ? t('{count} questions', { count }) + ' · ' + t('{count} minutes', { count: time })
            : t('{count} questions', { count: totalQuestions })}
        </Text>
        <div className="quiz-action-group">
          {selectedMode === 'exam' && hasExamDraft && (
            <Button
              onClick={() => onSelectMode('exam', { time, count, feedbackMode, fresh: true })}
            >
              {t('Start a new exam')}
            </Button>
          )}
          <Button
            type="primary"
            size="large"
            onClick={() => onSelectMode(selectedMode, { time, count, feedbackMode })}
          >
            {t(
              selectedMode === 'summary'
                ? 'Read Quick Summary'
                : selectedMode === 'exam'
                  ? hasExamDraft
                    ? 'Resume'
                    : 'Start mock exam'
                  : 'Start practice'
            )}
          </Button>
        </div>
      </div>
      {!quickSummary && (
        <Paragraph type="secondary" className="mode-guide-notice">
          {t('No guide published yet')}
        </Paragraph>
      )}
    </Card>
  );
}
