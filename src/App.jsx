// App.jsx
import React, { useState, useEffect } from 'react';
import { Layout, Typography, Upload, Button, message, Empty, Card, Row, Col, Select, Modal, Space, Divider, Avatar, Dropdown, Spin } from 'antd';
import { UploadOutlined, FileTextOutlined, PlayCircleOutlined, CloudUploadOutlined, ArrowLeftOutlined, LoginOutlined, GoogleOutlined, GithubOutlined, UserOutlined, LogoutOutlined, SettingOutlined, BookFilled } from '@ant-design/icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';
import './markdown.css';
import QuizMode from './components/QuizMode';
import PracticeMode from './components/PracticeMode';
import ExamMode from './components/ExamMode';
import SettingsModal from './components/SettingsModal';
import userService from './services/userService';
import { getAssetUrl } from './utils/paths';

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
  const [showQuizSelection, setShowQuizSelection] = useState(false); // New state for quiz selection
  const [selectedQuiz, setSelectedQuiz] = useState(null); // Selected quiz from dropdown
  const [loginModalVisible, setLoginModalVisible] = useState(false); // Login modal state
  const [settingsModalVisible, setSettingsModalVisible] = useState(false); // Settings modal state
  const [initialQuestionIndex, setInitialQuestionIndex] = useState(0); // Initial question index for PracticeMode
  const [quizSelectionProgress, setQuizSelectionProgress] = useState(null); // Saved progress found during quiz selection
  const [quizSelectionLoading, setQuizSelectionLoading] = useState(false); // Loading state while checking Firestore
  
  // Available demo quizzes organized by folder
  const availableQuizzes = [
    // Test Quiz (for E2E testing)
    { id: 'test-quiz', name: 'Test Quiz (E2E)', file: 'quiz/test/test-quiz.json', category: 'Test' },
    // AWS
    { id: 'aws-ace', name: 'AWS Certified Cloud Practitioner (ACE)', file: 'quiz/AWS/AWS-ACE.json', category: 'AWS' },
    { id: 'aws-saa', name: 'AWS Solutions Architect Associate (SAA)', file: 'quiz/AWS/AWS_SAA.json', category: 'AWS' },
    { id: 'aws-dva', name: 'AWS Developer Associate (DVA)', file: 'quiz/AWS/AWS_DVA.json', category: 'AWS' },
    { id: 'aws-dea', name: 'AWS Data Engineer Associate (DEA)', file: 'quiz/AWS/AWS_DEA.json', category: 'AWS' },
    // Azure
    { id: 'az-900', name: 'Microsoft Azure Fundamentals (AZ-900)', file: 'quiz/Azure/AZ-900.json', category: 'Azure' },
    // Google Cloud
    { id: 'gcp-ace', name: 'Google Cloud Associate Cloud Engineer (ACE)', file: 'quiz/Google/GCP-ACE.json', category: 'Google Cloud' },
    { id: 'gcp-pca', name: 'Google Cloud Professional Cloud Architect (PCA)', file: 'quiz/Google/GCP-PCA.json', category: 'Google Cloud' },
    { id: 'gcp-pcd', name: 'Google Cloud Professional Cloud Developer (PCD)', file: 'quiz/Google/GCP_PCD.json', category: 'Google Cloud' },
    { id: 'gcp-pcde', name: 'Google Cloud Professional Cloud Data Engineer (PCDE)', file: 'quiz/Google/GCP-PCDE.json', category: 'Google Cloud' },
    { id: 'gcp-gal', name: 'Google Generative AI Leader (GAL)', file: 'quiz/Google/GCP-GAL.json', category: 'Google Cloud' }
  ];
  
  // Load demo quiz (no longer checks Firestore — progress is handled inline at selection)
  const loadDemoQuiz = async (quizFile, quizName, quizId) => {
    try {
      const response = await fetch(getAssetUrl(quizFile));
      if (!response.ok) {
        throw new Error(`Failed to load quiz: ${response.status}`);
      }
      const data = await response.json();
      setQuestions(data);
      setFileUploaded(true);
      setFileName(quizName);
      setStartScreen(false);
      setShowQuizSelection(false);
      message.success(`${quizName} loaded successfully!`);
    } catch (error) {
      console.error('Error loading quiz:', error);
      message.error('Failed to load quiz. Please try again or upload your own file.');
    }
  };

  // Load quiz and jump directly to Practice mode at a specific question
  const loadAndResumePractice = async (quizFile, quizName, quizId, questionIndex) => {
    try {
      const response = await fetch(getAssetUrl(quizFile));
      if (!response.ok) throw new Error(`Failed to load quiz: ${response.status}`);
      const data = await response.json();
      setQuestions(data);
      setFileUploaded(true);
      setFileName(quizName);
      setInitialQuestionIndex(questionIndex);
      setMode('practice');
      setStartScreen(false);
      setShowQuizSelection(false);
      setQuizSelectionProgress(null);
      message.success(`Resuming ${quizName} from question ${questionIndex + 1}`);
    } catch (error) {
      console.error('Error loading quiz:', error);
      message.error('Failed to load quiz. Please try again.');
    }
  };
  
  // Show quiz selection screen — auto-selects the most recently saved quiz if any
  const showQuizSelectionScreen = async () => {
    setShowQuizSelection(true);
    setQuizSelectionProgress(null);
    setSelectedQuiz(null);

    if (!user) {
      setQuizSelectionLoading(false);
      return;
    }

    setQuizSelectionLoading(true);
    try {
      const allProgress = await userService.getAllQuizProgress(user.uid);
      // Find the most recently saved quiz that exists in availableQuizzes
      const availableIds = availableQuizzes.map(q => q.id);
      const candidates = Object.entries(allProgress)
        .filter(([id]) => availableIds.includes(id))
        .sort((a, b) => {
          // Sort by savedAt descending (most recent first)
          const timeA = a[1].savedAt?.toMillis?.() ?? 0;
          const timeB = b[1].savedAt?.toMillis?.() ?? 0;
          return timeB - timeA;
        });

      if (candidates.length > 0) {
        const [quizId, progress] = candidates[0];
        setSelectedQuiz(quizId);
        setQuizSelectionProgress(progress);
      }
    } catch (err) {
      console.error('Error pre-loading quiz progress:', err);
    } finally {
      setQuizSelectionLoading(false);
    }
  };
  
  // Go back from quiz selection
  const backFromQuizSelection = () => {
    setShowQuizSelection(false);
    setSelectedQuiz(null);
    setQuizSelectionProgress(null);
    setQuizSelectionLoading(false);
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
    setInitialQuestionIndex(0);
  };
  
  const goToStartScreen = () => {
    setFileUploaded(false);
    setQuestions([]);
    setFileName('');
    setMode(null);
    setStartScreen(true);
    setInitialQuestionIndex(0);
  };

  // Get auth context
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  // Handle Google login
  const handleGoogleLogin = async () => {
    setLoginModalVisible(false);
    const result = await signInWithGoogle();
    
    if (result.success) {
      message.success(`Welcome, ${result.user.displayName}!`);
    } else {
      message.error(result.error || 'Failed to sign in with Google');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    const result = await signOut();
    
    if (result.success) {
      message.success('Signed out successfully');
    } else {
      message.error('Failed to sign out');
    }
  };

  // Handle settings click
  const handleSettingsClick = () => {
    setSettingsModalVisible(true);
  };

  // Handle return to home page
  const handleReturnHome = () => {
    setStartScreen(true);
    setShowQuizSelection(false);
    setMode(null);
    setFileUploaded(false);
    setFileName('');
    setQuestions([]);
    setInitialQuestionIndex(0);
  };

  // User menu items
  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <div>
          <div style={{ fontWeight: 'bold' }}>{user?.displayName}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{user?.email}</div>
        </div>
      ),
      disabled: true
    },
    {
      type: 'divider'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: handleSettingsClick
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleLogout
    }
  ];

  // Simplified header without the back button
  const renderHeader = () => (
    <Header className="ant-layout-header">
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title 
          level={3} 
          style={{ color: 'white', margin: 0, cursor: 'pointer' }}
          onClick={handleReturnHome}
          data-testid="app-home-link"
        >
          Quiz Application
        </Title>
        
        {authLoading ? (
          <Spin />
        ) : user ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px' }}>
              <Avatar 
                src={user.photoURL} 
                icon={<UserOutlined />}
                style={{ marginRight: '8px' }}
              />
              <span style={{ color: 'white' }}>{user.displayName}</span>
            </div>
          </Dropdown>
        ) : (
          <Button 
            type="primary"
            icon={<LoginOutlined />}
            onClick={() => setLoginModalVisible(true)}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            data-testid="open-login-modal"
          >
            Login
          </Button>
        )}
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
      
      <Content className="ant-layout-content">
        {startScreen && !showQuizSelection ? (
          // Initial start screen with options
          <div style={{ textAlign: 'center' }}>
            <Title level={2}>Welcome to Quiz Application</Title>
            <Paragraph>Please choose an option to get started:</Paragraph>
            
            <Row gutter={16} style={{ marginTop: '30px' }}>
              <Col xs={24} sm={12}>
                <Card 
                  hoverable 
                  style={{ height: '100%' }}
                  onClick={showQuizSelectionScreen}
                  className="option-card"
                  data-testid="demo-quiz-card"
                >
                  <PlayCircleOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '15px' }} />
                  <Title level={4}>Load Demo Quiz</Title>
                  <Paragraph>
                    Choose from our pre-loaded set of questions to try out the application.
                  </Paragraph>
                  <Button type="primary" size="large" icon={<PlayCircleOutlined />} style={{ marginTop: '10px' }}>
                    Select Quiz
                  </Button>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} style={{ marginTop: { xs: '20px', sm: '0' } }}>
                <Card 
                  hoverable 
                  style={{ height: '100%' }}
                  className="option-card"
                  data-testid="upload-quiz-card"
                >
                  <div>
                    <CloudUploadOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '15px' }} />
                    <Title level={4}>Upload Your Own Quiz</Title>
                    <Paragraph>
                      Use your own JSON file with custom questions.
                    </Paragraph>
                    
                    <Upload {...uploadProps} data-testid="upload-quiz">
                      <Button type="primary" size="large" icon={<UploadOutlined />} style={{ marginTop: '10px' }} data-testid="upload-quiz-button">
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
                href={getAssetUrl('sample-quiz.json')} 
                download="sample-quiz.json"
                data-testid="download-sample-quiz"
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
        ) : showQuizSelection ? (
          // Quiz selection screen
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px' }}>
            <Title level={2} style={{ textAlign: 'center' }}>Select a Quiz</Title>
            <Paragraph style={{ textAlign: 'center', marginBottom: '30px' }}>
              Choose from our available quizzes:
            </Paragraph>
            
            <Card style={{ marginBottom: '20px' }}>
              <Select
                size="large"
                style={{ width: '100%' }}
                placeholder="Select a quiz to load"
                value={selectedQuiz}
                data-testid="quiz-select"
                onChange={async (value) => {
                  setSelectedQuiz(value);
                  setQuizSelectionProgress(null);
                  if (user && value) {
                    setQuizSelectionLoading(true);
                    const progress = await userService.getQuizProgress(user.uid, value);
                    setQuizSelectionProgress(progress ?? null);
                    setQuizSelectionLoading(false);
                  }
                }}
                showSearch
                optionFilterProp="label"
                options={(() => {
                  // Group quizzes by category
                  const categories = [...new Set(availableQuizzes.map(q => q.category))];
                  return categories.map(category => ({
                    label: category,
                    options: availableQuizzes
                      .filter(q => q.category === category)
                      .map(quiz => ({
                        label: quiz.name,
                        value: quiz.id
                      }))
                  }));
                })()}
              />
              
              {/* Firestore progress check result */}
              {quizSelectionLoading && (
                <div style={{ marginTop: '14px', textAlign: 'center', padding: '10px' }}>
                  <Spin size="small" /> <Text style={{ marginLeft: 8 }} type="secondary">Checking saved progress...</Text>
                </div>
              )}

              {!quizSelectionLoading && quizSelectionProgress && (
                <div className="quiz-progress-notice" style={{
                  marginTop: '14px',
                  padding: '14px 16px',
                  backgroundColor: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: '8px',
                }}>                  
                  <div className="quiz-progress-notice-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <BookFilled style={{ color: '#fa8c16', fontSize: '16px' }} />
                    <Text strong style={{ color: '#d46b08' }}>Saved progress found!</Text>
                  </div>
                  <Text className="quiz-progress-notice-text">You left off at <Text strong>Question {quizSelectionProgress.questionIndex + 1}</Text>. Do you want to continue from there?</Text>
                  <div className="quiz-progress-notice-actions" style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                    <Button
                      className="quiz-progress-action-button"
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      style={{ flex: 1, backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
                      data-testid="resume-saved-progress"
                      onClick={() => {
                        const quiz = availableQuizzes.find(q => q.id === selectedQuiz);
                        if (quiz) loadAndResumePractice(quiz.file, quiz.name, quiz.id, quizSelectionProgress.questionIndex);
                      }}
                    >
                      Yes, resume from Q{quizSelectionProgress.questionIndex + 1}
                    </Button>
                    <Button
                      className="quiz-progress-action-button"
                      style={{ flex: 1 }}
                      data-testid="start-from-beginning"
                      onClick={async () => {
                        if (user && selectedQuiz) {
                          await userService.clearQuizProgress(user.uid, selectedQuiz);
                        }
                        setQuizSelectionProgress(null);
                      }}
                    >
                      No, start from beginning
                    </Button>
                  </div>
                </div>
              )}

              {!quizSelectionLoading && !quizSelectionProgress && (
                <Button
                  type="primary"
                  size="large"
                  block
                  style={{ marginTop: '20px' }}
                  disabled={!selectedQuiz}
                  icon={<PlayCircleOutlined />}
                  data-testid="load-selected-quiz"
                  onClick={() => {
                    const quiz = availableQuizzes.find(q => q.id === selectedQuiz);
                    if (quiz) {
                      loadDemoQuiz(quiz.file, quiz.name, quiz.id);
                    }
                  }}
                >
                  Load Selected Quiz
                </Button>
              )}
            </Card>
            
            <div style={{ textAlign: 'center' }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                size="large"
                onClick={backFromQuizSelection}
                data-testid="back-from-quiz-selection"
              >
                Back
              </Button>
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
              <Upload {...uploadProps} data-testid="change-quiz-file">
                <Button icon={<UploadOutlined />} data-testid="change-quiz-file-button">Change File</Button>
              </Upload>
            </div>
            <Text data-testid="loaded-quiz-summary">Loaded {questions.length} questions from {fileName}</Text>
            <QuizMode onSelectMode={handleModeSelect} />
            
            {/* Back button rendered at the bottom */}
            {renderBackButton()}
          </>
        ) : mode === 'practice' && questions.length > 0 ? (
          <PracticeMode 
            questions={questions} 
            onExit={resetApp} 
            initialQuestionIndex={initialQuestionIndex}
            quizId={selectedQuiz}
          />
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
      {/* Login Modal */}
      <Modal
        title="Choose Login Method"
        open={loginModalVisible}
        onCancel={() => setLoginModalVisible(false)}
        footer={null}
        centered
      >
        <div style={{ padding: '20px 0' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Button 
              type="primary"
              icon={<GoogleOutlined />}
              size="large"
              block
              onClick={handleGoogleLogin}
              style={{ height: '50px', fontSize: '16px' }}
              data-testid="login-with-google"
            >
              Login with Google
            </Button>
          </Space>
          
          <Divider style={{ margin: '24px 0' }} />
          
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Button 
              icon={<GithubOutlined />}
              size="large"
              block
              disabled
              style={{ height: '50px', fontSize: '16px' }}
              data-testid="login-with-github"
            >
              Login with GitHub (Coming Soon)
            </Button>
          </Space>
        </div>
      </Modal>
      
      {/* Settings Modal */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />
    </Layout>
  );
}

export default App;