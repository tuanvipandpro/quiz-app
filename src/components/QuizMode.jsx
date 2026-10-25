import React, { useEffect, useState } from 'react';
import { Card, Typography, Radio, Select, Tag } from 'antd';
import { PlayCircleOutlined, FormOutlined, ReadOutlined } from '@ant-design/icons';
import QuizActionButton from './QuizActionButton';

const { Title, Paragraph, Text } = Typography;

function QuizMode({ onSelectMode, totalQuestions, quickSummary = null }) {
  const availableQuestionCount = Math.max(1, totalQuestions || 1);
  const examQuestionOptions = [50, 60, 70, 80];
  const [selectedMode, setSelectedMode] = useState('practice');
  const [examTime, setExamTime] = useState(60);
  const [examQuestionCount, setExamQuestionCount] = useState(Math.min(50, availableQuestionCount));

  useEffect(() => {
    setExamQuestionCount(Math.min(50, availableQuestionCount));
  }, [availableQuestionCount]);

  const questionCounts = availableQuestionCount < 50
    ? [availableQuestionCount, ...examQuestionOptions]
    : examQuestionOptions;
  const isExam = selectedMode === 'exam';
  const isSummary = selectedMode === 'summary' && !!quickSummary;

  const handleStart = () => {
    if (isSummary) onSelectMode('summary');
    else if (isExam) onSelectMode('exam', examTime, examQuestionCount);
    else onSelectMode('practice');
  };

  return (
    <Card className="quiz-mode-picker">
      <Title level={3} className="quiz-mode-picker-title">Choose your mode</Title>
      <Radio.Group className="quiz-mode-options" role="radiogroup" aria-label="Quiz mode"
        value={selectedMode} onChange={event => setSelectedMode(event.target.value)}>
        <Radio.Button value="summary" disabled={!quickSummary} className="quiz-mode-summary">
          <ReadOutlined className="quiz-mode-option-icon" />
          <span className="quiz-mode-option-copy">
            <span className="quiz-mode-option-title">Quick Summary <Tag color={quickSummary ? 'blue' : undefined}>{quickSummary ? 'Available' : 'Coming soon'}</Tag></span>
            <span className="quiz-mode-option-description">Exam guide, key concepts &amp; memory tips</span>
          </span>
        </Radio.Button>
        <Radio.Button value="practice">
          <PlayCircleOutlined className="quiz-mode-option-icon" />
          <span className="quiz-mode-option-copy">
            <span className="quiz-mode-option-title">Practice</span>
            <span className="quiz-mode-option-description">Learn at your own pace</span>
          </span>
        </Radio.Button>
        <Radio.Button value="exam">
          <FormOutlined className="quiz-mode-option-icon" />
          <span className="quiz-mode-option-copy">
            <span className="quiz-mode-option-title">Exam</span>
            <span className="quiz-mode-option-description">Take a timed mock test</span>
          </span>
        </Radio.Button>
      </Radio.Group>

      <div className="quiz-mode-details">
        <Paragraph className="quiz-mode-description">
          {isSummary ? 'Review key concepts, answer-selection tips, and common traps for this quiz.'
            : isExam ? 'Answer random questions and see your score at the end.'
            : 'Answer questions in sequence with instant feedback after each answer.'}
        </Paragraph>
        {isExam && <div className="quiz-exam-fields">
          <div className="quiz-exam-field">
            <label htmlFor="exam-question-count">Questions</label>
            <Select id="exam-question-count" value={examQuestionCount} onChange={setExamQuestionCount}
              options={questionCounts.map(count => ({
                value: count, label: `${count} questions`, disabled: count > availableQuestionCount,
              }))} />
          </div>
          <div className="quiz-exam-field">
            <label htmlFor="exam-time">Time limit</label>
            <Select id="exam-time" value={examTime} onChange={setExamTime}
              options={[{ value: 60, label: '1 hour' }, { value: 120, label: '2 hours' }]} />
          </div>
          {availableQuestionCount < 80 && <Text type="secondary" className="quiz-exam-limit">
            Up to {availableQuestionCount} questions available.
          </Text>}
        </div>}
        <div className="quiz-mode-start">
          <Text type="secondary">{isSummary ? 'Tiếng Việt · Ôn nhanh theo chủ đề' : isExam
            ? `${examQuestionCount} questions · ${examTime === 60 ? '1 hour' : '2 hours'}`
            : `${availableQuestionCount} questions · No time limit`}</Text>
          <QuizActionButton label={isSummary ? 'Read Quick Summary' : isExam ? 'Start Exam' : 'Start Practice'}
            icon={isSummary ? <ReadOutlined /> : isExam ? <FormOutlined /> : <PlayCircleOutlined />} type="primary" size="large" onClick={handleStart} />
        </div>
      </div>
    </Card>
  );
}

export default QuizMode;
