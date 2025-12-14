// components/PracticeMode.jsx
import React, { useState } from 'react';
import { Button, Progress, Space, Typography, Card, Modal, Spin, InputNumber, Tooltip, Input, message } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, HomeOutlined, EnterOutlined, QuestionCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import Question from './Question';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { getExplanation, saveApiKey, hasApiKey } from '../utils/geminiApi';
import { useAuth } from '../hooks/useAuth';

const { Title, Text, Paragraph } = Typography;

function PracticeMode({ questions, onExit }) {
  const { isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [jumpToQuestion, setJumpToQuestion] = useState(null);
  
  // Explanation state
  const [explanation, setExplanation] = useState('');
  const [explanationModalVisible, setExplanationModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // API Key state
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  
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
    // Check if user is authenticated
    if (!isAuthenticated) {
      message.warning('Please login to use the Explain feature');
      return;
    }
    
    // Check if API key exists
    const apiKeyExists = await hasApiKey(user?.uid);
    if (!apiKeyExists) {
      setApiKeyModalVisible(true);
      return;
    }
    
    setExplanationModalVisible(true); // Ensure the dialog is opened immediately
    setIsLoading(true);
    
    try {
      const explanationText = await getExplanation(
        currentQuestion.question, 
        currentQuestion.options, 
        currentQuestion.answer,
        user?.uid
      );
      setExplanation(explanationText);
    } catch (error) {
      if (error.code === 'NO_API_KEY') {
        setExplanationModalVisible(false);
        setApiKeyModalVisible(true);
      } else {
        setExplanation("Sorry, we encountered an error getting the explanation.");
      }
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle saving API key
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveApiKey(apiKeyInput.trim());
      setApiKeyModalVisible(false);
      setApiKeyInput('');
      // Retry getting explanation
      handleExplainClick();
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left side: Navigation and Explain buttons */}
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
          
          <Tooltip title={!isAuthenticated ? 'Please login to use this feature' : ''}>
            <Button 
              type="primary"
              icon={<QuestionCircleOutlined />}
              onClick={handleExplainClick}
              disabled={!isAuthenticated}
              style={isAuthenticated ? { backgroundColor: '#722ed1', borderColor: '#722ed1' } : {}}
            >
              Explain
            </Button>
          </Tooltip>
        </Space>
        
        {/* Right side: Exit button */}
        <Button 
          icon={<HomeOutlined />}
          onClick={onExit}
        >
          Exit to Menu
        </Button>
      </div>
      
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
      
      {/* API Key Input Modal */}
      <Modal
        title="Enter Gemini API Key"
        open={apiKeyModalVisible}
        onOk={handleSaveApiKey}
        onCancel={() => setApiKeyModalVisible(false)}
        okText="Save & Continue"
        cancelText="Cancel"
      >
        <Paragraph>
          To use the AI explanation feature, please enter your Google Gemini API key.
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: '12px' }}>
          Get your free API key at: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
        </Paragraph>
        <Input.TextArea
          placeholder="Enter your Gemini API key here..."
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          rows={3}
          style={{ marginTop: '10px' }}
        />
        <Paragraph type="warning" style={{ fontSize: '12px', marginTop: '10px' }}>
          Your API key will be stored locally in your browser.
        </Paragraph>
      </Modal>
    </div>
  );
}

export default PracticeMode;