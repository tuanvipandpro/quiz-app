// components/SettingsModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Card, Space, Input, Button, Typography, message } from 'antd';
import { SettingOutlined, KeyOutlined, LogoutOutlined } from '@ant-design/icons';
import { getApiKey, saveApiKey, hasApiKey, clearApiKey } from '../utils/geminiApi';

const { Text } = Typography;

/**
 * Settings Modal Component
 * Manages application settings including Gemini API key
 */
function SettingsModal({ visible, onClose }) {
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Load existing API key when modal opens
  useEffect(() => {
    if (visible) {
      const existingKey = getApiKey();
      setApiKeyInput(existingKey || '');
    }
  }, [visible]);

  // Handle save API key
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveApiKey(apiKeyInput.trim());
      message.success('API key saved successfully!');
      onClose();
    } else {
      message.warning('Please enter an API key');
    }
  };

  // Handle clear API key
  const handleClearApiKey = () => {
    clearApiKey();
    setApiKeyInput('');
    message.info('API key cleared');
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
    >
      <div style={{ padding: '20px 0' }}>
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
            
            {hasApiKey() && (
              <Button 
                danger 
                size="small" 
                onClick={handleClearApiKey}
                icon={<LogoutOutlined />}
              >
                Clear API Key
              </Button>
            )}
            
            <div style={{ 
              backgroundColor: '#f0f5ff', 
              padding: '12px', 
              borderRadius: '4px',
              border: '1px solid #d6e4ff'
            }}>
              <Text style={{ fontSize: '12px' }}>
                <strong>Note:</strong> Your API key is stored locally in your browser and is never sent to our servers.
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
    </Modal>
  );
}

export default SettingsModal;
