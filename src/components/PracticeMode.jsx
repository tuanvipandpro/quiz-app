// components/PracticeMode.jsx
import React, { useState } from 'react';
import { Button, Progress, Space, Typography, Card, Modal, Spin, InputNumber, Tooltip, message, Badge } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, HomeOutlined, EnterOutlined, QuestionCircleOutlined, BookFilled, BookOutlined } from '@ant-design/icons';
import Question from './Question';
import { useExplanation } from '../hooks/useExplanation';
import ExplanationDialogs from './ExplanationDialogs';
import { useAuth } from '../hooks/useAuth';
import userService from '../services/userService';

const { Title, Text, Paragraph } = Typography;

function PracticeMode({ questions, onExit, initialQuestionIndex = 0, quizId = null }) {
  const { isAuthenticated, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialQuestionIndex);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [jumpToQuestion, setJumpToQuestion] = useState(null);


  // Marked question state (tracks the saved checkpoint index)
  const [markedIndex, setMarkedIndex] = useState(
    initialQuestionIndex > 0 ? initialQuestionIndex : null
  );
  const [isMarking, setIsMarking] = useState(false);
  
  const currentQuestion = questions[currentIndex];
  const ai = useExplanation(currentQuestion, user?.uid);
  
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

  const handleExplainClick = () => {
    if (!isAuthenticated) {
      message.warning('Please login to use the Explain feature');
      return;
    }
    return ai.explain();
  };

  // Initialize the selected answer type based on question type
  React.useEffect(() => {
    if (hasMultipleAnswers && !Array.isArray(selectedAnswer)) {
      setSelectedAnswer([]);
    } else if (!hasMultipleAnswers && Array.isArray(selectedAnswer)) {
      setSelectedAnswer(null);
    }
  }, [currentIndex, hasMultipleAnswers, selectedAnswer]);

  // Save current question as progress checkpoint in Firestore (always overrides)
  const handleSaveQuestion = () => {
    if (!isAuthenticated) {
      message.warning('Please login to use the Save feature');
      return;
    }
    if (!quizId) {
      message.warning('Save is only available for demo quizzes');
      return;
    }

    // Already saved HERE → confirm remove
    if (markedIndex === currentIndex) {
      Modal.confirm({
        title: 'Remove saved progress?',
        icon: <BookFilled style={{ color: '#fa8c16' }} />,
        content: `Question ${currentIndex + 1} is your current checkpoint. Do you want to remove it?`,
        okText: 'Remove',
        okButtonProps: { danger: true },
        cancelText: 'Keep',
        onOk: async () => {
          setIsMarking(true);
          try {
            await userService.clearQuizProgress(user.uid, quizId);
            setMarkedIndex(null);
            message.success('Saved progress removed');
          } catch (err) {
            message.error('Failed to remove progress');
          } finally {
            setIsMarking(false);
          }
        }
      });
      return;
    }

    // Save (overrides any previous progress for any quiz)
    Modal.confirm({
      title: 'Save progress?',
      icon: <BookFilled style={{ color: '#fa8c16' }} />,
      content: (
        <span>
          Save <strong>Question {currentIndex + 1}</strong> as your checkpoint?
          Next time you load this quiz, you can resume from here.
          {markedIndex !== null && (
            <div className="saved-progress-override" style={{ marginTop: 8, fontSize: 12 }}>
              This will override your current checkpoint at Question {markedIndex + 1}.
            </div>
          )}
        </span>
      ),
      okText: 'Save',
      cancelText: 'Cancel',
      onOk: async () => {
        setIsMarking(true);
        try {
          await userService.saveQuizProgress(user.uid, quizId, currentIndex);
          setMarkedIndex(currentIndex);
          message.success(`Question ${currentIndex + 1} saved!`);
        } catch (err) {
          message.error('Failed to save progress');
        } finally {
          setIsMarking(false);
        }
      }
    });
  };

  return (
    <div>
      <Title level={2}>Practice Mode</Title>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {/* Question navigation */}
        <Space>
          <Text strong>Question {currentIndex + 1} of {questions.length}</Text>
          {markedIndex !== null && (
            <Tooltip title={`Saved at question ${markedIndex + 1} — click Save to update`}>
              <span className="saved-question-indicator" style={{ fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '2px', cursor: 'default' }}>
                <BookFilled />
                <Text className="saved-question-indicator" style={{ fontSize: '12px' }}>Q{markedIndex + 1} saved</Text>
              </span>
            </Tooltip>
          )}
        </Space>
        
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
          
          <Tooltip title={!isAuthenticated ? 'Please login to use this feature' : ''}>            <Button 
              type="primary"
              icon={<QuestionCircleOutlined />}
              onClick={handleExplainClick}
              disabled={!isAuthenticated}
              style={isAuthenticated ? { backgroundColor: '#722ed1', borderColor: '#722ed1' } : {}}
            >
              Explain
            </Button>
          </Tooltip>

          <Tooltip title={
            !isAuthenticated
              ? 'Please login to save your progress'
              : !quizId
              ? 'Save is only available for demo quizzes'
              : markedIndex === currentIndex
              ? 'Progress saved here — click to update'
              : markedIndex !== null
              ? `Click to move checkpoint from Q${markedIndex + 1} to here`
              : 'Save this question as your resume checkpoint'
          }>
            <Button
              icon={markedIndex === currentIndex ? <BookFilled /> : <BookOutlined />}
              onClick={handleSaveQuestion}
              loading={isMarking}
              disabled={!isAuthenticated || !quizId}
              style={
                markedIndex === currentIndex
                  ? { backgroundColor: '#fa8c16', borderColor: '#fa8c16', color: '#fff' }
                  : {}
              }
            >
              {markedIndex === currentIndex ? 'Saved' : 'Save'}
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
      
      <ExplanationDialogs question={currentQuestion} state={ai} />

    </div>
  );
}

export default PracticeMode;
