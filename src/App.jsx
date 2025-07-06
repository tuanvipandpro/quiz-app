// App.jsx
import React, { useState, useEffect } from 'react';
import { Layout, Typography, Upload, Button, message, Empty, Card, Row, Col } from 'antd';
import { UploadOutlined, FileTextOutlined, PlayCircleOutlined, CloudUploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import './App.css';
import './markdown.css';
import QuizMode from './components/QuizMode';
import PracticeMode from './components/PracticeMode';
import ExamMode from './components/ExamMode';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

function App() {
  const [questions, setQuestions] = useState([]);
  const [mode, setMode] = useState(null); // 'practice' or 'exam'
  const [examTime, setExamTime] = useState(60); // Default 1 hour in minutes
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [startScreen, setStartScreen] = useState(true); // New state for initial screen
  
  // Load demo quiz
  const loadDemoQuiz = async () => {
    try {
      const response = await fetch('/quiz-app/quiz.json');
      if (!response.ok) {
        throw new Error(`Failed to load demo quiz: ${response.status}`);
      }
      const data = await response.json();
      setQuestions(data);
      setFileUploaded(true);
      setFileName('Demo Quiz');
      setStartScreen(false);
      message.success('Demo quiz loaded successfully!');
    } catch (error) {
      console.error('Error loading demo quiz:', error);
      message.error('Failed to load demo quiz. Please try again or upload your own file.');
    }
  };
  
  // File upload props
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.json',
    showUploadList: true,
    maxCount: 1,
    beforeUpload: (file) => {
      // Check file type
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        message.error('You can only upload JSON files!');
        return Upload.LIST_IGNORE;
      }
      
      // Parse the file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Validate the JSON structure
          if (!Array.isArray(data)) {
            message.error('The JSON file must contain an array of questions!');
            return;
          }
          
          // Check if questions have the required fields
          const isValid = data.every(q => 
            q.id && q.question && q.options && q.answer && Array.isArray(q.answer)
          );
          
          if (!isValid) {
            message.error('Some questions are missing required fields (id, question, options, answer)');
            return;
          }
          
          // Set the questions and mark file as uploaded
          setQuestions(data);
          setFileUploaded(true);
          setFileName(file.name);
          setStartScreen(false);
          message.success(`${file.name} uploaded successfully!`);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          message.error('Error parsing JSON file. Please check the file format.');
        }
      };
      reader.readAsText(file);
      
      // Prevent default upload behavior
      return false;
    },
    onRemove: () => {
      setQuestions([]);
      setFileUploaded(false);
      setFileName('');
      setMode(null);
    }
  };

  const handleModeSelect = (selectedMode, time) => {
    setMode(selectedMode);
    if (time) {
      setExamTime(time);
    }
  };

  const resetApp = () => {
    setMode(null);
  };
  
  const goToStartScreen = () => {
    setFileUploaded(false);
    setQuestions([]);
    setFileName('');
    setMode(null);
    setStartScreen(true);
  };

  // Simplified header without the back button
  const renderHeader = () => (
    <Header style={{ padding: '0 24px', display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ color: 'white', margin: '15px 0' }}>
          Quiz Application
        </Title>
        <div></div>
      </div>
    </Header>
  );

  // Back button component for the bottom of the screen
  const renderBackButton = () => {
    if (!startScreen && !mode) {
      return (
        <div style={{ textAlign: 'center', marginTop: '30px', paddingBottom: '20px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            size="large"
            onClick={goToStartScreen}
          >
            Back to Start Screen
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      {renderHeader()}
      
      <Content style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
        {startScreen ? (
          // Initial start screen with options
          <div style={{ textAlign: 'center' }}>
            <Title level={2}>Welcome to Quiz Application</Title>
            <Paragraph>Please choose an option to get started:</Paragraph>
            
            <Row gutter={16} style={{ marginTop: '30px' }}>
              <Col xs={24} sm={12}>
                <Card 
                  hoverable 
                  style={{ height: '100%' }}
                  onClick={loadDemoQuiz}
                  className="option-card"
                >
                  <PlayCircleOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '15px' }} />
                  <Title level={4}>Use Demo Quiz</Title>
                  <Paragraph>
                    Start with our pre-loaded set of questions to try out the application.
                  </Paragraph>
                  <Button type="primary" size="large" icon={<PlayCircleOutlined />} style={{ marginTop: '10px' }}>
                    Load Demo Quiz
                  </Button>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} style={{ marginTop: { xs: '20px', sm: '0' } }}>
                <Card 
                  hoverable 
                  style={{ height: '100%' }}
                  className="option-card"
                >
                  <div>
                    <CloudUploadOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '15px' }} />
                    <Title level={4}>Upload Your Own Quiz</Title>
                    <Paragraph>
                      Use your own JSON file with custom questions.
                    </Paragraph>
                    
                    <Upload {...uploadProps}>
                      <Button type="primary" size="large" icon={<UploadOutlined />} style={{ marginTop: '10px' }}>
                        Upload Quiz File
                      </Button>
                    </Upload>
                  </div>
                </Card>
              </Col>
            </Row>
            
            <div style={{ marginTop: '30px' }}>
              <Title level={5}>Need a sample file?</Title>
              <Button 
                type="link" 
                href="/quiz-app/sample-quiz.json" 
                download="sample-quiz.json"
              >
                Download Sample Quiz File
              </Button>
              
              <div style={{ marginTop: '20px', textAlign: 'left' }}>
                <Text type="secondary">
                  Example format:
                  <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '10px', 
                    borderRadius: '5px',
                    textAlign: 'left',
                    overflow: 'auto'
                  }}>
{`[
  {
    "id": "1",
    "question": "What is the capital of France?",
    "options": {
      "A": "London",
      "B": "Berlin",
      "C": "Paris",
      "D": "Madrid"
    },
    "answer": ["C"]
  }
]`}
                  </pre>
                </Text>
              </div>
            </div>
          </div>
        ) : !mode ? (
          // Quiz mode selection after file is loaded
          <>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <Title level={2}>Quiz Questions Loaded!</Title>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>Change File</Button>
              </Upload>
            </div>
            <Text>Loaded {questions.length} questions from {fileName}</Text>
            <QuizMode onSelectMode={handleModeSelect} />
            
            {/* Back button rendered at the bottom */}
            {renderBackButton()}
          </>
        ) : mode === 'practice' && questions.length > 0 ? (
          <PracticeMode questions={questions} onExit={resetApp} />
        ) : mode === 'exam' && questions.length > 0 ? (
          <ExamMode 
            questions={questions} 
            onExit={resetApp} 
            examTimeMinutes={examTime}
          />
        ) : (
          <Empty 
            description="No valid questions found" 
            style={{ marginTop: '50px' }}
          />
        )}
      </Content>
    </Layout>
  );
}

export default App;