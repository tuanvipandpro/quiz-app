// components/SettingsModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Card, Space, Input, Button, Typography, message, Spin } from 'antd';
import { SettingOutlined, KeyOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { getApiKey, saveApiKey, hasApiKey, clearApiKey } from '../utils/geminiApi';
import { useAuth } from '../hooks/useAuth';

const { Text } = Typography;

/**
 * Settings Modal Component
 * Manages application settings including Gemini API key
 */
function SettingsModal({ visible, onClose }) {
  const { user, userProfile, isAuthenticated, refreshUserProfile } = useAuth();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Load existing API key when modal opens
  useEffect(() => {
    const loadApiKey = async () => {
      if (visible) {
        setLoading(true);
        try {
          // Get API key from Firestore if user is logged in
          const existingKey = await getApiKey(user?.uid);
          setApiKeyInput(existingKey || '');
        } catch (error) {
          console.error('Error loading API key:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadApiKey();
  }, [visible, user]);

  // Handle save API key
  const handleSaveApiKey = async () => {
    if (apiKeyInput.trim()) {
      setLoading(true);
      try {
        // Save to Firestore if user is logged in
        await saveApiKey(apiKeyInput.trim(), user?.uid);
        
        // Refresh user profile to get updated data
        if (isAuthenticated && refreshUserProfile) {
          await refreshUserProfile();
        }
        
        message.success(
          isAuthenticated 
            ? 'API key saved to your profile!' 
            : 'API key saved locally!'
        );
        onClose();
      } catch (error) {
        console.error('Error saving API key:', error);
        message.error('Failed to save API key');
      } finally {
        setLoading(false);
      }
    } else {
      message.warning('Please enter an API key');
    }
  };

  // Handle clear API key
  const handleClearApiKey = async () => {
    setLoading(true);
    try {
      await clearApiKey(user?.uid);
      setApiKeyInput('');
      
      // Refresh user profile
      if (isAuthenticated && refreshUserProfile) {
        await refreshUserProfile();
      }
      
      message.info('API key cleared');
    } catch (error) {
      console.error('Error clearing API key:', error);
      message.error('Failed to clear API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Settings</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleSaveApiKey}
      okText="Save"
      cancelText="Cancel"
      width={600}
      confirmLoading={loading}
    >
      <Spin spinning={loading}>
        <div style={{ padding: '20px 0' }}>
          {/* User Info Section */}
          {isAuthenticated && (
            <Card 
              title={
                <Space>
                  <UserOutlined />
                  <span>User Profile</span>
                </Space>
              }
              size="small"
              style={{ marginBottom: '20px' }}
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div>
                  <Text strong>Email:</Text> <Text>{user?.email}</Text>
                </div>
                <div>
                  <Text strong>Name:</Text> <Text>{user?.displayName || 'N/A'}</Text>
                </div>
                <div style={{ 
                  backgroundColor: '#e6f7ff', 
                  padding: '8px', 
                  borderRadius: '4px',
                  border: '1px solid #91d5ff'
                }}>
                  <Text style={{ fontSize: '11px' }}>
                    ✓ Your API key is synced to your account and available on any device
                  </Text>
                </div>
              </Space>
            </Card>
          )}
          
          {/* Gemini API Key Section */}
          <Card 
            title={
              <Space>
                <KeyOutlined />
                <span>Gemini API Key</span>
              </Space>
            }
            size="small"
            style={{ marginBottom: '20px' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Enter your Google Gemini API key to enable AI-powered explanations for quiz questions.
                </Text>
              </div>
              
              <Input.TextArea
                placeholder="Enter your Gemini API key here..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                rows={3}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
                disabled={loading}
              />
              
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Get your free API key at:{' '}
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ fontSize: '11px' }}
                  >
                    Google AI Studio
                  </a>
                </Text>
              </div>
              
              {apiKeyInput && (
                <Button 
                  danger 
                  size="small" 
                  onClick={handleClearApiKey}
                  icon={<LogoutOutlined />}
                  disabled={loading}
                >
                  Clear API Key
                </Button>
              )}
              
              <div style={{ 
                backgroundColor: isAuthenticated ? '#f6ffed' : '#f0f5ff', 
                padding: '12px', 
                borderRadius: '4px',
                border: isAuthenticated ? '1px solid #b7eb8f' : '1px solid #d6e4ff'
              }}>
                <Text style={{ fontSize: '12px' }}>
                  <strong>Note:</strong> {isAuthenticated 
                    ? 'Your API key is securely stored in your Firestore profile and synced across all your devices.'
                    : 'Your API key is stored locally in your browser. Sign in to sync it across devices.'
                  }
                </Text>
              </div>
            </Space>
          </Card>
        
          {/* Future Settings Placeholder */}
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#fafafa', 
            borderRadius: '4px' 
          }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              More settings coming soon...
            </Text>
          </div>
        </div>
      </Spin>
    </Modal>
  );
}

export default SettingsModal;
