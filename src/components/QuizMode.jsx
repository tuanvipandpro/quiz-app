import React, { useEffect, useState } from 'react';
import { Card, Button, Space, Typography, Radio, Divider } from 'antd';

const { Title, Paragraph } = Typography;

function QuizMode({ onSelectMode, totalQuestions }) {
  const availableQuestionCount = Math.max(1, totalQuestions || 1);
  const examQuestionOptions = [50, 60, 70, 80];
  const [examTime, setExamTime] = useState(60); // Default to 60 minutes (1 hour)
  const [examQuestionCount, setExamQuestionCount] = useState(Math.min(50, availableQuestionCount));

  useEffect(() => {
    setExamQuestionCount(availableQuestionCount >= 50 ? 50 : availableQuestionCount);
  }, [availableQuestionCount]);

  const handleStartExam = () => {
    onSelectMode('exam', examTime, examQuestionCount);
  };

  return (
    <Card>
      <Title level={2}>Choose Quiz Mode</Title>
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card type="inner" title="Practice Mode">
          <Paragraph>
            Answer questions one by one in sequence. See instant feedback after each answer.
          </Paragraph>
          <Button type="primary" size="large" onClick={() => onSelectMode('practice')}>
            Start Practice
          </Button>
        </Card>
        
        <Card type="inner" title="Exam Mode">
          <Paragraph>
            Take a test with your selected number of random questions. Your score will be displayed after completing all questions.
          </Paragraph>

          <Divider orientation="left">Question Count</Divider>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio.Group
              onChange={(e) => setExamQuestionCount(e.target.value)}
              value={examQuestionCount}
            >
              {examQuestionOptions.map((count) => (
                <Radio key={count} value={count} disabled={count > availableQuestionCount}>
                  {count} Questions
                </Radio>
              ))}
            </Radio.Group>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Select one option. Choices above {availableQuestionCount} are unavailable for this quiz.
            </Paragraph>
          </Space>
          
          <Divider orientation="left">Exam Time</Divider>
          
          <Radio.Group 
            onChange={(e) => setExamTime(e.target.value)} 
            value={examTime}
          >
            <Radio value={60}>1 Hour</Radio>
            <Radio value={120}>2 Hours</Radio>
          </Radio.Group>

          <Divider orientation="left"></Divider>
          
          <Button type="primary" size="large" onClick={handleStartExam}>
            Start Exam
          </Button>
        </Card>
      </Space>
    </Card>
  );
}

export default QuizMode;