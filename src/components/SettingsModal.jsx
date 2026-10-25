import React, { useEffect, useRef, useState } from 'react';
import { Modal, Card, Space, Input, Typography, Alert, Spin } from 'antd';
import { CheckOutlined, SaveOutlined, ApiOutlined, DeleteOutlined } from '@ant-design/icons';
import QuizActionButton from './QuizActionButton';
import { useAuth } from '../hooks/useAuth';
import { credentials, testConnection } from '../services/llm';
import { PROVIDERS } from '../services/llm/modelRegistry';

const { Text, Paragraph } = Typography;

function SettingsModal({ visible, onClose }) {
  const { user, isAuthenticated } = useAuth();
  const [keys, setKeys] = useState({ gemini: '', groq: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [statuses, setStatuses] = useState({});
  const operation = useRef(0);
  const testRequest = useRef(null);
  const uid = user?.uid || null;

  useEffect(() => {
    const id = ++operation.current;
    testRequest.current?.abort();
    setKeys({ gemini: '', groq: '' });
    setNotice(null);
    setStatuses({});
    setBusy(null);
    if (visible) {
      setLoading(true);
      credentials.getKeys(uid).then(value => {
        if (operation.current === id) setKeys(value);
      }).catch(() => {
        if (operation.current === id) setNotice({ type: 'error', text: 'Could not load AI keys. Close settings and retry.' });
      }).finally(() => { if (operation.current === id) setLoading(false); });
    }
    return () => { operation.current++; testRequest.current?.abort(); };
  }, [visible, uid]);

  const run = async (provider, action) => {
    const id = operation.current;
    setBusy(`${provider}:${action}`);
    setNotice(null);
    try {
      if (action === 'test') {
        testRequest.current = new AbortController();
        const result = await testConnection(provider, keys[provider], testRequest.current.signal);
        if (operation.current === id) setStatuses(value => ({ ...value, [provider]: { type: 'success', text: `Connected: ${result.model}` } }));
      } else {
        const value = action === 'clear' ? '' : keys[provider].trim();
        await credentials.saveKey(provider, value, uid);
        if (operation.current !== id) return;
        setKeys(current => ({ ...current, [provider]: value }));
        setStatuses(current => ({ ...current, [provider]: null }));
        setNotice({ type: 'success', text: action === 'clear' ? 'API key removed.' : uid ? 'API key saved to your profile.' : 'API key saved in this browser.' });
      }
    } catch (error) {
      if (operation.current === id && error.code !== 'CANCELLED') setNotice({ type: 'error', text: error.message });
    } finally {
      if (operation.current === id) setBusy(null);
    }
  };

  return (
    <Modal title="AI Settings" open={visible} onCancel={onClose} width={620}
      footer={<QuizActionButton label="Done" icon={<CheckOutlined />} onClick={onClose} />}>
      <Spin spinning={loading}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {isAuthenticated && <Text>Profile: {user.displayName || user.email}</Text>}
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Add a key for either provider. Flash-Lite is preferred, followed by Groq and Gemini Flash. Gemma is the last resort.
            {uid ? ' Keys are saved in your Firebase profile. Signing out keeps your saved keys.' : ' Guest keys are stored in this browser and cleared when your sign-in session changes.'}
          </Paragraph>
          {notice && <Alert showIcon type={notice.type} message={notice.text} />}
          {PROVIDERS.map(provider => (
            <Card key={provider.id} className="ai-provider-card" title={provider.name} size="small"
              extra={<a href={provider.keyUrl} target="_blank" rel="noopener noreferrer">Get API key</a>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input.Password aria-label={`${provider.name} API key`} placeholder={`Enter your ${provider.name} API key`}
                  value={keys[provider.id]} disabled={loading || !!busy} autoComplete="off"
                  onChange={event => { setKeys(value => ({ ...value, [provider.id]: event.target.value })); setStatuses(value => ({ ...value, [provider.id]: null })); }} />
                <Space wrap>
                  <QuizActionButton label={`Save ${provider.name} key`} icon={<SaveOutlined />} type="primary" disabled={loading || !!busy || !keys[provider.id].trim()} loading={busy === `${provider.id}:save`} onClick={() => run(provider.id, 'save')}>Save</QuizActionButton>
                  <QuizActionButton label={`Test ${provider.name} connection`} icon={<ApiOutlined />} disabled={loading || !!busy || !keys[provider.id].trim()} loading={busy === `${provider.id}:test`} onClick={() => run(provider.id, 'test')}>Test connection</QuizActionButton>
                  <QuizActionButton label={`Clear ${provider.name} key`} icon={<DeleteOutlined />} danger disabled={loading || !!busy} loading={busy === `${provider.id}:clear`} onClick={() => run(provider.id, 'clear')}>Clear key</QuizActionButton>
                </Space>
                <Text type="secondary">Test connection sends a small request using this key and uses your provider quota. Save to use it for explanations.</Text>
                {statuses[provider.id] && <Alert type={statuses[provider.id].type} message={statuses[provider.id].text} showIcon />}
              </Space>
            </Card>
          ))}
        </Space>
      </Spin>
    </Modal>
  );
}

export default SettingsModal;
