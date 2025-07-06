// components/ExamMode.jsx
import React, { useState, useEffect } from 'react';
import { Button, Progress, Space, Typography, Card, Result, Badge, Statistic, Modal, Spin, Row, Col } from 'antd';
import { 
  ArrowLeftOutlined, 
  ArrowRightOutlined, 
  CheckOutlined, 
  HomeOutlined, 
  ClockCircleOutlined, 
  QuestionCircleOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import Question from './Question';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { getExplanation } from '../utils/geminiApi';
import 'antd/dist/reset.css';


const { Title, Text, Paragraph } = Typography;
const { Countdown } = Statistic;
const { confirm } = Modal;

function ExamMode({ questions, onExit, examTimeMinutes }) {
  // Select 50 random questions for the exam
  const [examQuestions, setExamQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [examEndTime, setExamEndTime] = useState(0);
  const [timeExpired, setTimeExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  // Explanation state
  const [explanation, setExplanation] = useState('');
  const [explanationModalVisible, setExplanationModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize exam with 50 random questions and set up timer
  useEffect(() => {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const examSize = Math.min(50, questions.length);
    const selected = shuffled.slice(0, examSize);
    setExamQuestions(selected);
    
    // Initialize answers array with null for single-answer questions and empty arrays for multiple-answer questions
    const initialAnswers = selected.map(q => q.answer.length > 1 ? [] : null);
    setAnswers(initialAnswers);
    
    // Set exam end time
    const deadline = Date.now() + (examTimeMinutes * 60 * 1000);
    setExamEndTime(deadline);
  }, [questions, examTimeMinutes]);
  
  // Update time left counter each second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const timeRemaining = Math.max(0, examEndTime - now);
      
      if (timeRemaining > 0) {
        // Calculate hours, minutes, seconds
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [examEndTime]);
  
  // Handle time expiration
  const handleTimeExpire = () => {
    setTimeExpired(true);
    handleSubmit();
  };
  
  // Calculate how many questions have been answered
  const getAnsweredQuestions = () => {
    return answers.filter((a, i) => {
      const q = examQuestions[i];
      return q.answer.length > 1 ? (Array.isArray(a) && a.length > 0) : a !== null;
    }).length;
  };
  
  // Handle exit confirmation
  const handleExitClick = () => {
    const answeredCount = getAnsweredQuestions();
    const unansweredCount = examQuestions.length - answeredCount;
    
    // Format time remaining for display
    const { hours, minutes, seconds } = timeLeft;
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    onExit();
    // confirm({
    //   title: 'Do you want to exit the exam?',
    //   icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
    //   content: (
    //     <div style={{ marginTop: '20px' }}>
    //       <Paragraph>
    //         Your progress will be lost and you will not receive a score.
    //       </Paragraph>
          
    //       <Row gutter={[0, 16]} style={{ marginTop: '20px' }}>
    //         <Col span={24}>
    //           <Card size="small">
    //             <Row align="middle">
    //               <Col span={16}>
    //                 <Space>
    //                   <CheckCircleOutlined style={{ color: '#52c41a' }} />
    //                   <Text strong>Questions Answered:</Text>
    //                 </Space>
    //               </Col>
    //               <Col span={8} style={{ textAlign: 'right' }}>
    //                 <Text strong>{answeredCount} of {examQuestions.length}</Text>
    //               </Col>
    //             </Row>
    //           </Card>
    //         </Col>
            
    //         <Col span={24}>
    //           <Card size="small">
    //             <Row align="middle">
    //               <Col span={16}>
    //                 <Space>
    //                   <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    //                   <Text strong>Questions Unanswered:</Text>
    //                 </Space>
    //               </Col>
    //               <Col span={8} style={{ textAlign: 'right' }}>
    //                 <Text strong>{unansweredCount}</Text>
    //               </Col>
    //             </Row>
    //           </Card>
    //         </Col>
            
    //         <Col span={24}>
    //           <Card size="small">
    //             <Row align="middle">
    //               <Col span={16}>
    //                 <Space>
    //                   <ClockCircleOutlined style={{ color: '#1890ff' }} />
    //                   <Text strong>Time Remaining:</Text>
    //                 </Space>
    //               </Col>
    //               <Col span={8} style={{ textAlign: 'right' }}>
    //                 <Text strong>{timeString}</Text>
    //               </Col>
    //             </Row>
    //           </Card>
    //         </Col>
    //       </Row>
    //     </div>
    //   ),
    //   okText: 'Yes, Exit',
    //   okType: 'danger',
    //   cancelText: 'No, Continue',
    //   onOk() {
    //     onExit();
    //   },
    //   width: 500,
    // });
  };
  
  if (examQuestions.length === 0) {
    return <div>Loading exam questions...</div>;
  }
  
  const currentQuestion = examQuestions[currentIndex];
  
  // Calculate progress with 2 decimal places
  const progressValue = ((currentIndex + 1) / examQuestions.length) * 100;
  const progress = parseFloat(progressValue.toFixed(2));
  
  // Determine if current question has multiple correct answers
  const hasMultipleAnswers = currentQuestion.answer.length > 1;
  
  const handleAnswer = (answer) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = answer;
    setAnswers(newAnswers);
  };
  
  const goToNextQuestion = () => {
    if (currentIndex < examQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  // Get explanation from Gemini API
  const handleExplainClick = async () => {
    setIsLoading(true);
    setExplanationModalVisible(true);
    
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
  
  // Check if an answer is correct
  const isAnswerCorrect = (questionIndex) => {
    const question = examQuestions[questionIndex];
    const answer = answers[questionIndex];
    
    if (question.answer.length > 1) {
      // Multiple answer question
      if (!Array.isArray(answer) || answer.length !== question.answer.length) return false;
      
      // Check if all selected answers are in the correct answers list
      return answer.every(ans => question.answer.includes(ans)) &&
             question.answer.every(ans => answer.includes(ans));
    } else {
      // Single answer question
      return answer === question.answer[0];
    }
  };
  
  const handleSubmit = () => {
    // Calculate score
    let correctCount = 0;
    for (let i = 0; i < examQuestions.length; i++) {
      if (isAnswerCorrect(i)) {
        correctCount++;
      }
    }
    
    setScore(correctCount);
    setExamSubmitted(true);
  };
  
  // Check if all questions are answered (either with a string value or non-empty array)
  const allAnswered = answers.every((answer, index) => {
    const question = examQuestions[index];
    if (question.answer.length > 1) {
      // For multiple answer questions, need at least one answer
      return Array.isArray(answer) && answer.length > 0;
    } else {
      // For single answer questions, need non-null value
      return answer !== null;
    }
  });
  
  if (examSubmitted) {
    return (
      <Result
        status="success"
        title={timeExpired ? "Time's Up!" : "Exam Completed!"}
        subTitle={`Your score: ${score}/${examQuestions.length} (${(score / examQuestions.length * 100).toFixed(2)}%)`}
        extra={[
          <Button type="primary" key="back" onClick={onExit}>
            Return to Menu
          </Button>
        ]}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Exam Mode</Title>
        
        {/* Timer display */}
        <Badge.Ribbon text="Time Remaining" color="blue">
          <Card style={{ width: 180 }}>
            <Space>
              <ClockCircleOutlined />
              <Countdown 
                value={examEndTime}
                format="HH:mm:ss"
                onFinish={handleTimeExpire}
              />
            </Space>
          </Card>
        </Badge.Ribbon>
      </div>
      
      {/* Display current question number out of total */}
      <div style={{ marginBottom: '10px', marginTop: '20px' }}>
        <Text strong>Question {currentIndex + 1} of {examQuestions.length}</Text>
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
          options={currentQuestion.options}
          selectedAnswer={answers[currentIndex]}
          onSelectAnswer={handleAnswer}
          showFeedback={false}
          correctOptions={currentQuestion.answer}
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
          disabled={currentIndex === examQuestions.length - 1}
        >
          Next <ArrowRightOutlined />
        </Button>
        
        <Button 
          type="primary"
          danger
          icon={<CheckOutlined />}
          onClick={handleSubmit}
          disabled={!allAnswered}
        >
          Finish Exam
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
          onClick={handleExitClick}
        >
          Exit to Menu
        </Button>
      </Space>
      
      {/* Display question completion stats */}
      <div style={{ marginTop: '20px' }}>
        <Text>
          {getAnsweredQuestions()} of {examQuestions.length} questions answered
        </Text>
        
        {!allAnswered && (
          <div style={{ marginTop: '10px' }}>
            <Text type="warning">You must answer all questions before submitting the exam.</Text>
          </div>
        )}
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
              {currentQuestion.answer.map((opt) => (
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

export default ExamMode;