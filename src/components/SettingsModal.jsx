import React, { useEffect, useRef, useState } from 'react';
import { Modal, Card, Collapse, Space, Input, Typography, Alert, Spin, Button } from 'antd';
import { SaveOutlined, ApiOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { credentials, testConnection } from '../services/llm';
import { PROVIDERS } from '../services/llm/modelRegistry';
import AiSourceControl from './AiSourceControl';
import { useAiSource } from '../hooks/useAiSource';

const { Text, Paragraph } = Typography;

export default function SettingsModal({ visible, onClose, afterClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [keys, setKeys] = useState({ gemini: '', groq: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [statuses, setStatuses] = useState({});
  const operation = useRef(0);
  const testRequest = useRef(null);
  const uid = user?.uid || null;
  const { source } = useAiSource(uid);
  useEffect(() => {
    const id = ++operation.current;
    testRequest.current?.abort();
    setKeys({ gemini: '', groq: '' });
    setNotice(null);
    setStatuses({});
    setBusy(null);
    if (visible && source === 'byok') {
      setLoading(true);
      credentials
        .getKeys(uid)
        .then((value) => {
          if (operation.current === id) setKeys(value);
        })
        .catch(() => {
          if (operation.current === id)
            setNotice({ type: 'error', key: 'Could not load AI keys. Close settings and retry.' });
        })
        .finally(() => {
          if (operation.current === id) setLoading(false);
        });
    } else setLoading(false);
    return () => {
      operation.current++;
      testRequest.current?.abort();
    };
  }, [visible, uid, source]);
  const run = async (provider, action) => {
    const id = operation.current;
    setBusy(`${provider}:${action}`);
    setNotice(null);
    try {
      if (action === 'test') {
        testRequest.current = new AbortController();
        const result = await testConnection(provider, keys[provider], testRequest.current.signal);
        if (operation.current === id)
          setStatuses((value) => ({ ...value, [provider]: result.model }));
      } else {
        const value = action === 'clear' ? '' : keys[provider].trim();
        await credentials.saveKey(provider, value, uid);
        if (operation.current !== id) return;
        setKeys((current) => ({ ...current, [provider]: value }));
        setStatuses((current) => ({ ...current, [provider]: null }));
        setNotice({
          type: 'success',
          key:
            action === 'clear'
              ? 'API key removed.'
              : uid
                ? 'API key saved to your profile.'
                : 'API key saved in this browser.',
        });
      }
    } catch (error) {
      if (operation.current === id && error.code !== 'CANCELLED')
        setNotice({ type: 'error', key: error.message });
    } finally {
      if (operation.current === id) setBusy(null);
    }
  };
  return (
    <Modal
      title={t('AI Settings')}
      className="ai-settings-modal"
      open={visible}
      onCancel={onClose}
      afterClose={afterClose}
      width={640}
      footer={<Button onClick={onClose}>{t('Done')}</Button>}
    >
      <Spin spinning={loading}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {uid && <Text>{t('Profile: {name}', { name: user.displayName || user.email })}</Text>}
          <AiSourceControl active={visible} />
          {source === 'byok' && (
            <Paragraph type="secondary" className="ai-settings-intro">
              {t('Add a key for Gemini or Groq to use AI explanations.')}{' '}
              {t(
                uid
                  ? 'Keys are saved in your profile. Signing out keeps your saved keys.'
                  : 'Guest keys stay in this browser and are cleared when your account changes.'
              )}
            </Paragraph>
          )}
          {notice && <Alert showIcon type={notice.type} message={t(notice.key)} />}
          {source === 'byok' &&
            PROVIDERS.map((provider) => (
              <Card
                key={provider.id}
                className="ai-provider-card"
                title={provider.name}
                size="small"
                extra={
                  <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer">
                    {t('Get API key')}
                  </a>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Input.Password
                    aria-label={t('{provider} API key', { provider: provider.name })}
                    placeholder={t('Enter your {provider} API key', { provider: provider.name })}
                    value={keys[provider.id]}
                    disabled={loading || !!busy}
                    visibilityToggle={false}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(event) => {
                      setKeys((value) => ({ ...value, [provider.id]: event.target.value }));
                      setStatuses((value) => ({ ...value, [provider.id]: null }));
                    }}
                  />
                  <Space wrap>
                    <Button
                      icon={<SaveOutlined aria-hidden="true" />}
                      type="primary"
                      disabled={loading || !!busy || !keys[provider.id].trim()}
                      loading={busy === `${provider.id}:save`}
                      onClick={() => run(provider.id, 'save')}
                    >
                      {t('Save key')}
                    </Button>
                    <Button
                      icon={<ApiOutlined aria-hidden="true" />}
                      disabled={loading || !!busy || !keys[provider.id].trim()}
                      loading={busy === `${provider.id}:test`}
                      onClick={() => run(provider.id, 'test')}
                    >
                      {t('Test connection')}
                    </Button>
                    <Button
                      icon={<DeleteOutlined aria-hidden="true" />}
                      danger
                      disabled={loading || !!busy}
                      loading={busy === `${provider.id}:clear`}
                      onClick={() => run(provider.id, 'clear')}
                    >
                      {t('Clear key')}
                    </Button>
                  </Space>
                  <Text type="secondary">
                    {t(
                      'Testing sends a small request and uses provider quota. Save the key to use it for explanations.'
                    )}
                  </Text>
                  <Collapse
                    size="small"
                    items={[
                      {
                        key: 'help',
                        label: t('How to get a {provider} API key', { provider: provider.name }),
                        children: (
                          <>
                            <ol>
                              {provider.keySteps.map((step) => (
                                <li key={step}>{t(step)}</li>
                              ))}
                            </ol>
                            <a href={provider.keyHelpUrl} target="_blank" rel="noopener noreferrer">
                              {t('Official setup guide')}
                            </a>
                          </>
                        ),
                      },
                    ]}
                  />
                  {statuses[provider.id] && (
                    <Alert
                      type="success"
                      showIcon
                      message={t('Connected: {model}', { model: statuses[provider.id] })}
                    />
                  )}
                </Space>
              </Card>
            ))}
        </Space>
      </Spin>
    </Modal>
  );
}
