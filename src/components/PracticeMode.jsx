// components/PracticeMode.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Button, Progress, Typography, Card, Modal, Spin, InputNumber, Tooltip, message, Alert } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, HomeOutlined, EnterOutlined, QuestionCircleOutlined, BookFilled, BookOutlined, CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import Question from './Question';
import QuizActionButton from './QuizActionButton';
import { useExplanation } from '../hooks/useExplanation';
import ExplanationDialogs from './ExplanationDialogs';
import { useAuth } from '../hooks/useAuth';
import { resolveCheckpoint } from '../utils/quizProgress';

const { Title, Text, Paragraph } = Typography;

function PracticeMode({ questions, onExit, initialQuestionIndex = 0, quizId = null, progressState }) {
  const { isAuthenticated, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialQuestionIndex);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [jumpToQuestion, setJumpToQuestion] = useState(null);
  const [isCopying, setIsCopying] = useState(false);


  const savedCheckpoint = progressState.progress[quizId];
  const savedPosition = resolveCheckpoint(questions, savedCheckpoint);
  const checkpointNeedsUpdate = savedPosition?.adjusted && savedPosition.reason !== 'moved';
  const markedIndex = checkpointNeedsUpdate ? null : savedPosition?.index ?? null;
  const isMarking = !!progressState.pendingQuiz;
  const [progressAction, setProgressAction] = useState(null);
  const [progressActionError, setProgressActionError] = useState(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const progressRevision = useRef(0);
  useEffect(() => {
    progressRevision.current++;
    return () => { progressRevision.current++; };
  }, [user?.uid, quizId]);

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
      messageApi.warning('Please login to use the Explain feature');
      return;
    }
    return ai.explain();
  };

  const handleCopyQuestion = async () => {
    const parts = [currentQuestion.question];
    if (currentQuestion.imageUrl?.trim()) {
      parts.push(`Image: ${currentQuestion.imageUrl.trim()}`);
    }
    parts.push(Object.entries(currentQuestion.options)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}. ${value}`)
      .join('\n'));

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(parts.join('\n\n'));
      messageApi.success('Question copied!');
    } catch {
      messageApi.error('Could not copy. Please select and copy the question manually.');
    } finally {
      setIsCopying(false);
    }
  };

  // Initialize the selected answer type based on question type
  React.useEffect(() => {
    if (hasMultipleAnswers && !Array.isArray(selectedAnswer)) {
      setSelectedAnswer([]);
    } else if (!hasMultipleAnswers && Array.isArray(selectedAnswer)) {
      setSelectedAnswer(null);
    }
  }, [currentIndex, hasMultipleAnswers, selectedAnswer]);

  const handleSaveProgress = () => {
    if (!isAuthenticated || !quizId || isMarking || progressState.loading || progressState.error) return;
    if (markedIndex === currentIndex) return;
    setProgressActionError(null);
    setProgressAction({ index: currentIndex, questionId: currentQuestion.id, revision: progressRevision.current });
  };

  const handleConfirmProgress = async () => {
    const action = progressAction;
    if (!action || isMarking || progressRevision.current !== action.revision) return;
    setProgressActionError(null);
    try {
      await progressState.save(quizId, action.index, action.questionId);
      if (progressRevision.current === action.revision) {
        setProgressAction(null);
        messageApi.success('Question ' + (action.index + 1) + ' saved!');
      }
    } catch (error) {
      if (progressRevision.current === action.revision && error.code !== 'SESSION_CHANGED') {
        setProgressActionError(error.message);
      }
    }
  };

  return (
    <div className="quiz-mode quiz-practice-mode">
      {messageContextHolder}
      <div className="quiz-mode-header">
        <Title level={2}>Practice Mode</Title>
        <QuizActionButton label="Exit to Menu" icon={<HomeOutlined />} onClick={onExit} />
      </div>
      {quizId && isAuthenticated && progressState.loading && <Paragraph><Spin size="small" /> Checking saved progress...</Paragraph>}
      {quizId && isAuthenticated && progressState.error && <Alert type="error" showIcon style={{ marginBottom: 16 }}
        message={progressState.error} action={<QuizActionButton label="Retry saved progress" icon={<ReloadOutlined />} size="small" onClick={progressState.reload}>Retry</QuizActionButton>} />}
      {quizId && isAuthenticated && checkpointNeedsUpdate && <Alert type="warning" showIcon style={{ marginBottom: 16 }}
        message="Your saved question is no longer available. Save progress to set a new checkpoint." />}
      
      <div className="practice-position-row">
        <div className="practice-position">
          <Text strong>Question {currentIndex + 1} of {questions.length}</Text>
          {markedIndex !== null && <Tooltip title={'Progress saved at question ' + (markedIndex + 1)}>
            <span className="saved-question-indicator"><BookFilled /> Q{markedIndex + 1} saved</span>
          </Tooltip>}
        </div>
        <div className="practice-jump">
          <Text className="practice-jump-label">Go to question:</Text>
          <InputNumber aria-label="Question number" placeholder="Q#" min={1} max={questions.length}
            value={jumpToQuestion} onChange={setJumpToQuestion} style={{ width: '70px' }}
            onPressEnter={handleJumpToQuestion} />
          <Tooltip title="Jump to question">
            <Button className="quiz-action-button" aria-label="Jump to question" icon={<EnterOutlined />}
              onClick={handleJumpToQuestion} disabled={!jumpToQuestion || jumpToQuestion < 1 || jumpToQuestion > questions.length} />
          </Tooltip>
        </div>
      </div>

      {/* Display progress with format prop to show decimal places */}
      <Progress 
        percent={progress} 
        status="active" 
        format={percent => `${percent.toFixed(2)}%`}
      />
      
      <Card className="quiz-question-shell">
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
      
      <div className="quiz-action-bar" role="group" aria-label="Practice actions">
        <div className="quiz-action-group">
          <QuizActionButton label="Previous question" type="primary" icon={<ArrowLeftOutlined />}
            onClick={goToPreviousQuestion} disabled={currentIndex === 0}>Previous</QuizActionButton>
          <QuizActionButton label="Next question" type="primary" icon={<ArrowRightOutlined />}
            onClick={goToNextQuestion} disabled={currentIndex === questions.length - 1}>Next</QuizActionButton>
        </div>
        <div className="quiz-action-group">
          <QuizActionButton label="Explain" icon={<QuestionCircleOutlined />} type="primary"
            tooltip={isAuthenticated ? 'Explain this question' : 'Please login to use this feature'}
            onClick={handleExplainClick} disabled={!isAuthenticated}
            style={isAuthenticated ? { backgroundColor: '#722ed1', borderColor: '#722ed1' } : {}} />
          <QuizActionButton label="Copy" tooltip="Copy question and answer choices" icon={<CopyOutlined />}
            onClick={handleCopyQuestion} loading={isCopying} />
          <QuizActionButton label={markedIndex === currentIndex ? 'Saved progress' : 'Save progress'}
            tooltip={!isAuthenticated ? 'Please login to save your progress' : !quizId ? 'Save is only available for demo quizzes'
              : markedIndex === currentIndex ? 'Progress is saved at this question' : 'Save this question as your resume checkpoint'}
            icon={markedIndex === currentIndex ? <BookFilled /> : <BookOutlined />} onClick={handleSaveProgress}
            loading={isMarking} disabled={!isAuthenticated || !quizId || isMarking || progressState.loading || !!progressState.error || markedIndex === currentIndex}
            style={markedIndex === currentIndex ? { backgroundColor: '#fa8c16', borderColor: '#fa8c16', color: '#fff' } : {}}>
            {markedIndex === currentIndex ? 'Saved' : 'Save progress'}
          </QuizActionButton>
        </div>
      </div>

      <Modal title="Save progress?"
        open={!!progressAction} onOk={handleConfirmProgress} confirmLoading={isMarking}
        okText="Save"
        cancelButtonProps={{ disabled: isMarking }} closable={!isMarking} maskClosable={!isMarking}
        onCancel={() => { if (!isMarking) setProgressAction(null); }}>
        <Paragraph>{'Save Question ' + ((progressAction?.index ?? 0) + 1) + ' as the checkpoint for this quiz? Your other quiz checkpoints will be kept.'}</Paragraph>
        {progressActionError && <Alert type="error" showIcon message={progressActionError} />}
      </Modal>
      <ExplanationDialogs question={currentQuestion} state={ai} />

    </div>
  );
}

export default PracticeMode;
