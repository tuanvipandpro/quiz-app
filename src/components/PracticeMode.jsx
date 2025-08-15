// components/PracticeMode.jsx
import React, { useState } from 'react';
import { Button, Progress, Space, Typography, Card, Modal, Spin, InputNumber, Tooltip } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, HomeOutlined, EnterOutlined, QuestionCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import Question from './Question';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { getExplanation } from '../utils/geminiApi';

const { Title, Text, Paragraph } = Typography;

function PracticeMode({ questions, onExit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [jumpToQuestion, setJumpToQuestion] = useState(null);
  
  // Explanation state
  const [explanation, setExplanation] = useState('');
  const [explanationModalVisible, setExplanationModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const currentQuestion = questions[currentIndex];
  
  // Calculate progress with 2 decimal places
  const progressValue = ((currentIndex + 1) / questions.length) * 100;
  const progress = parseFloat(progressValue.toFixed(2));
  
  const correctAnswers = currentQuestion.answer;
  
  // Determine if current question has multiple correct answers
  const hasMultipleAnswers = correctAnswers.length > 1;
  
  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    
    // For multiple choice questions, only show feedback when enough options are selected
    if (hasMultipleAnswers) {
      if (Array.isArray(answer) && answer.length === correctAnswers.length) {
        setAnswered(true);
      } else {
        setAnswered(false);
      }
    } else {
      // For single choice questions, show feedback immediately
      setAnswered(true);
    }
  };
  
  // Check if the selected answers are correct
  const checkIfCorrect = () => {
    if (!selectedAnswer) return false;
    
    if (hasMultipleAnswers) {
      // For multiple answers, check if selections match exactly with correct answers
      if (!Array.isArray(selectedAnswer)) return false;
      if (selectedAnswer.length !== correctAnswers.length) return false;
      
      // Check if all selected answers are in the correct answers list
      return selectedAnswer.every(ans => correctAnswers.includes(ans)) &&
             correctAnswers.every(ans => selectedAnswer.includes(ans));
    } else {
      // For single answer
      return selectedAnswer === correctAnswers[0];
    }
  };

  // Check if enough options are selected for multiple choice questions
  const hasEnoughSelections = () => {
    if (!hasMultipleAnswers) return true;
    return selectedAnswer && Array.isArray(selectedAnswer) && selectedAnswer.length === correctAnswers.length;
  };
  
  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // Initialize the answer for the next question
      const nextQuestion = questions[currentIndex + 1];
      setSelectedAnswer(nextQuestion.answer.length > 1 ? [] : null);
      setAnswered(false);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // Initialize the answer for the previous question
      const prevQuestion = questions[currentIndex - 1];
      setSelectedAnswer(prevQuestion.answer.length > 1 ? [] : null);
      setAnswered(false);
    }
  };
  
  // Handle navigation to a specific question number
  const handleJumpToQuestion = () => {
    if (jumpToQuestion && jumpToQuestion >= 1 && jumpToQuestion <= questions.length) {
      // Convert from 1-based (user-facing) to 0-based (internal) indexing
      const newIndex = jumpToQuestion - 1;
      setCurrentIndex(newIndex);
      const targetQuestion = questions[newIndex];
      setSelectedAnswer(targetQuestion.answer.length > 1 ? [] : null);
      setAnswered(false);
      setJumpToQuestion(null); // Clear the input after jumping
    }
  };

  // Get explanation from Gemini API
  const handleExplainClick = async () => {
    setExplanationModalVisible(true); // Ensure the dialog is opened immediately
    setIsLoading(true);
    
    try {
      const explanationText = await getExplanation(
        currentQuestion.question, 
        currentQuestion.options, 
        currentQuestion.answer
      );
      setExplanation(explanationText);
    } catch (error) {
      setExplanation("Sorry, we encountered an error getting the explanation.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Close the explanation modal
  const handleCloseModal = () => {
    setExplanationModalVisible(false);
  };

  // Initialize the selected answer type based on question type
  React.useEffect(() => {
    if (hasMultipleAnswers && !Array.isArray(selectedAnswer)) {
      setSelectedAnswer([]);
    } else if (!hasMultipleAnswers && Array.isArray(selectedAnswer)) {
      setSelectedAnswer(null);
    }
  }, [currentIndex, hasMultipleAnswers, selectedAnswer]);

  return (
    <div>
      <Title level={2}>Practice Mode</Title>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {/* Question navigation */}
        <Text strong>Question {currentIndex + 1} of {questions.length}</Text>
        
        {/* Jump to question input */}
        <Space>
          <Text>Go to question:</Text>
          <InputNumber 
            min={1} 
            max={questions.length} 
            value={jumpToQuestion}
            onChange={value => setJumpToQuestion(value)}
            style={{ width: '70px' }}
            onPressEnter={handleJumpToQuestion}
          />
          <Tooltip title="Jump to question">
            <Button 
              icon={<EnterOutlined />} 
              onClick={handleJumpToQuestion}
              disabled={!jumpToQuestion || jumpToQuestion < 1 || jumpToQuestion > questions.length}
            />
          </Tooltip>
        </Space>
      </div>
      
      {/* Display progress with format prop to show decimal places */}
      <Progress 
        percent={progress} 
        status="active" 
        format={percent => `${percent.toFixed(2)}%`}
      />
      
      <Card style={{ marginTop: '20px', marginBottom: '20px' }}>
        <Question 
          question={currentQuestion.question}
          imageUrl={currentQuestion.imageUrl}
          options={currentQuestion.options}
          selectedAnswer={selectedAnswer}
          onSelectAnswer={handleAnswer}
          showFeedback={answered}
          isCorrect={answered && hasEnoughSelections() && checkIfCorrect()}
          correctOptions={correctAnswers}
        />
      </Card>
      
      <Space>
        <Button 
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={goToPreviousQuestion}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        
        <Button 
          type="primary"
          onClick={goToNextQuestion}
          disabled={currentIndex === questions.length - 1}
        >
          Next <ArrowRightOutlined />
        </Button>
        
        <Button 
          type="primary"
          icon={<QuestionCircleOutlined />}
          onClick={handleExplainClick}
          style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
        >
          Explain
        </Button>
        
        <Button 
          icon={<HomeOutlined />}
          onClick={onExit}
        >
          Exit to Menu
        </Button>
      </Space>
      
      {/* Explanation Modal */}
      <Modal
        title="Question Explanation"
        open={explanationModalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" type="primary" onClick={handleCloseModal}>
            Close
          </Button>
        ]}
        width={700}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: '20px' }}>
              Generating explanation...
            </Paragraph>
          </div>
        ) : (
          <div className="markdown-explanation">
            <Title level={5}>Question:</Title>
            <Paragraph>{currentQuestion.question}</Paragraph>
            
            <Title level={5}>Correct Answer:</Title>
            <div style={{ marginBottom: '15px' }}>
              {correctAnswers
                .sort((a, b) => a.localeCompare(b)) // Sort correct answers by ABCD order
                .map((opt) => (
                  <div key={opt} style={{ marginBottom: '5px' }}>
                    <Text strong>{opt}. {currentQuestion.options[opt]}</Text>
                  </div>
                ))}
            </div>
            
            <Title level={5}>Explanation:</Title>
            <div className="markdown-container">
              <ReactMarkdown
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                  // Customize styling for specific markdown elements
                  h1: ({node, ...props}) => <h1 style={{fontSize: '1.8em', borderBottom: '1px solid #eee'}} {...props} />,
                  h2: ({node, ...props}) => <h2 style={{fontSize: '1.5em', borderBottom: '1px solid #eee'}} {...props} />,
                  h3: ({node, ...props}) => <h3 style={{fontSize: '1.3em'}} {...props} />,
                  h4: ({node, ...props}) => <h4 style={{fontSize: '1.2em'}} {...props} />,
                  p: ({node, ...props}) => <p style={{marginBottom: '1em', lineHeight: '1.6'}} {...props} />,
                  ul: ({node, ...props}) => <ul style={{paddingLeft: '2em', marginBottom: '1em'}} {...props} />,
                  ol: ({node, ...props}) => <ol style={{paddingLeft: '2em', marginBottom: '1em'}} {...props} />,
                  li: ({node, ...props}) => <li style={{marginBottom: '0.5em'}} {...props} />,
                  code: ({node, inline, ...props}) => (
                    inline 
                      ? <code style={{backgroundColor: '#f0f0f0', padding: '0.2em 0.4em', borderRadius: '3px'}} {...props} />
                      : <code style={{display: 'block', backgroundColor: '#f5f5f5', padding: '1em', borderRadius: '5px', overflowX: 'auto'}} {...props} />
                  ),
                  blockquote: ({node, ...props}) => (
                    <blockquote style={{borderLeft: '4px solid #ddd', paddingLeft: '1em', color: '#666'}} {...props} />
                  ),
                  table: ({node, ...props}) => (
                    <div style={{overflowX: 'auto'}}>
                      <table style={{borderCollapse: 'collapse', width: '100%'}} {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => <th style={{border: '1px solid #ddd', padding: '0.5em', backgroundColor: '#f5f5f5'}} {...props} />,
                  td: ({node, ...props}) => <td style={{border: '1px solid #ddd', padding: '0.5em'}} {...props} />
                }}
              >
                {explanation}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PracticeMode;