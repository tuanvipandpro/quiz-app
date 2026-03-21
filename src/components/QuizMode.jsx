import React, { useState } from 'react';
import { Card, Button, Space, Typography, Radio, Divider } from 'antd';

const { Title, Paragraph } = Typography;

function QuizMode({ onSelectMode }) {
  const [examTime, setExamTime] = useState(60); // Default to 60 minutes (1 hour)

  const handleStartExam = () => {
    onSelectMode('exam', examTime);
  };

  return (
    <Card data-testid="quiz-mode-selection">
      <Title level={2}>Choose Quiz Mode</Title>
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card type="inner" title="Practice Mode" data-testid="practice-mode-card">
          <Paragraph>
            Answer questions one by one in sequence. See instant feedback after each answer.
          </Paragraph>
          <Button type="primary" size="large" onClick={() => onSelectMode('practice')} data-testid="start-practice-mode">
            Start Practice
          </Button>
        </Card>
        
        <Card type="inner" title="Exam Mode" data-testid="exam-mode-card">
          <Paragraph>
            Take a test with 50 randomly selected questions. Your score will be displayed after completing all questions.
          </Paragraph>
          
          <Divider orientation="left">Exam Time</Divider>
          
          <Radio.Group 
            onChange={(e) => setExamTime(e.target.value)} 
            value={examTime}
            data-testid="exam-time-options"
          >
            <Radio value={60} data-testid="exam-time-60">1 Hour</Radio>
            <Radio value={120} data-testid="exam-time-120">2 Hours</Radio>
          </Radio.Group>

          <Divider orientation="left"></Divider>
          
          <Button type="primary" size="large" onClick={handleStartExam} data-testid="start-exam-mode">
            Start Exam
          </Button>
        </Card>
      </Space>
    </Card>
  );
}

export default QuizMode;