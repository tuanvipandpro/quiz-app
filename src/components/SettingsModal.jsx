import React, { useEffect, useId, useRef, useState } from 'react';
import { Modal, Input, Typography, Alert, Spin, Button, Radio, Tooltip } from 'antd';
import {
  SaveOutlined,
  ApiOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { credentials, testConnection } from '../services/llm';
import { PROVIDERS } from '../services/llm/modelRegistry';
import AiSourceControl from './AiSourceControl';
import { useAiSource } from '../hooks/useAiSource';
import { useSignIn } from '../hooks/useSignIn';
import SignInModal from './SignInModal';
import ApiKeyHelp from './ApiKeyHelp';

const { Text } = Typography;

export default function SettingsModal({ visible, onClose, afterClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [keys, setKeys] = useState({ gemini: '', groq: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0].id);
  const [savedKeys, setSavedKeys] = useState({});
  const [helpOpen, setHelpOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const inputId = useId();
  const signIn = useSignIn();
  const operation = useRef(0);
  const testRequest = useRef(null);
  const uid = user?.uid || null;
  const { source } = useAiSource(uid);
  const provider = PROVIDERS.find((item) => item.id === selectedProvider) || PROVIDERS[0];
  const disabled = loading || loadFailed || !!busy;
  useEffect(() => {
    const id = ++operation.current;
    testRequest.current?.abort();
    setKeys({ gemini: '', groq: '' });
    setNotice(null);
    setStatuses({});
    setSavedKeys({});
    setLoadFailed(false);
    setHelpOpen(false);
    setClearOpen(false);
    setBusy(null);
    if (visible && source === 'byok') {
      setLoading(true);
      credentials
        .getKeys(uid)
        .then((value) => {
          if (operation.current === id) {
            setKeys(value);
            setSavedKeys(value);
          }
        })
        .catch(() => {
          if (operation.current === id) {
            setLoadFailed(true);
            setNotice({ type: 'error', key: 'Could not load AI keys. Close settings and retry.' });
          }
        })
        .finally(() => {
          if (operation.current === id) setLoading(false);
        });
    } else setLoading(false);
    return () => {
      operation.current++;
      testRequest.current?.abort();
    };
  }, [visible, uid, source, loadRevision]);
  const run = async (provider, action) => {
    const id = operation.current;
    if (disabled) return;
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
        setSavedKeys((current) => ({ ...current, [provider]: value }));
        setStatuses((current) => ({ ...current, [provider]: null }));
        setNotice({
          type: 'success',
          provider,
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
        setNotice({ type: 'error', key: error.message, provider });
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
      width={520}
      footer={<Button onClick={onClose}>{t('Done')}</Button>}
    >
      <Spin spinning={loading}>
        <div className="ai-settings-content">
          {uid && <Text>{t('Profile: {name}', { name: user.displayName || user.email })}</Text>}
          <AiSourceControl active={visible} onSignIn={signIn.show} />
          {source === 'byok' && (
            <section className="ai-provider-form" aria-label={t('Your API key')}>
              <div className="ai-settings-row">
                <Text strong>{t('Manage keys')}</Text>
                <Button
                  type="text"
                  icon={<QuestionCircleOutlined aria-hidden="true" />}
                  aria-label={t('API key help')}
                  onClick={() => setHelpOpen(true)}
                >
                  {t('Help')}
                </Button>
              </div>
              <Radio.Group
                value={provider.id}
                className="ai-provider-options"
                aria-label={t('Key provider')}
                disabled={!!busy}
                onChange={(event) => setSelectedProvider(event.target.value)}
              >
                {PROVIDERS.map((item) => (
                  <Radio.Button key={item.id} value={item.id} aria-label={item.name}>
                    {item.shortName || item.name}
                  </Radio.Button>
                ))}
              </Radio.Group>
              <div className="ai-settings-row ai-key-label">
                <label htmlFor={inputId}>
                  {t('{provider} API key', { provider: provider.name })}
                </label>
                <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer">
                  {t('Get API key')}
                </a>
              </div>
              <Input.Password
                id={inputId}
                aria-label={t('{provider} API key', { provider: provider.name })}
                placeholder={t('Enter your {provider} API key', { provider: provider.name })}
                value={keys[provider.id]}
                disabled={disabled}
                visibilityToggle={false}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(event) => {
                  setKeys((value) => ({ ...value, [provider.id]: event.target.value }));
                  setStatuses((value) => ({ ...value, [provider.id]: null }));
                  setNotice((value) => (value?.provider === provider.id ? null : value));
                }}
              />
              <div className="ai-key-actions">
                <Button
                  icon={<SaveOutlined aria-hidden="true" />}
                  aria-label={t('Save key')}
                  type="primary"
                  disabled={disabled || !keys[provider.id].trim()}
                  loading={busy === `${provider.id}:save`}
                  onClick={() => run(provider.id, 'save')}
                >
                  {t('Save')}
                </Button>
                <Tooltip title={t('Testing uses provider quota.')}>
                  <Button
                    icon={<ApiOutlined aria-hidden="true" />}
                    aria-label={t('Test connection')}
                    disabled={disabled || !keys[provider.id].trim()}
                    loading={busy === `${provider.id}:test`}
                    onClick={() => run(provider.id, 'test')}
                  >
                    {t('Test')}
                  </Button>
                </Tooltip>
                <Tooltip title={t('Clear key')}>
                  <Button
                    icon={<DeleteOutlined aria-hidden="true" />}
                    danger
                    aria-label={t('Clear key')}
                    disabled={disabled || (!keys[provider.id].trim() && !savedKeys[provider.id])}
                    loading={busy === `${provider.id}:clear`}
                    onClick={() => setClearOpen(true)}
                  />
                </Tooltip>
              </div>
              {notice && (!notice.provider || notice.provider === provider.id) && (
                <Alert
                  showIcon
                  role={notice.type === 'error' ? 'alert' : 'status'}
                  type={notice.type}
                  message={t(notice.key)}
                  action={
                    loadFailed && (
                      <Button onClick={() => setLoadRevision((value) => value + 1)}>
                        {t('Retry')}
                      </Button>
                    )
                  }
                />
              )}
              {statuses[provider.id] && (
                <Alert
                  type="success"
                  showIcon
                  message={t('Connected: {model}', { model: statuses[provider.id] })}
                />
              )}
            </section>
          )}
        </div>
      </Spin>
      <ApiKeyHelp
        open={visible && helpOpen}
        onClose={() => setHelpOpen(false)}
        provider={provider}
        signedIn={!!uid}
      />
      <SignInModal {...signIn.modalProps} />
      <Modal
        open={visible && clearOpen}
        title={t('Remove this API key?')}
        className="ai-settings-modal"
        width={400}
        onCancel={() => setClearOpen(false)}
        onOk={() => {
          setClearOpen(false);
          run(provider.id, 'clear');
        }}
        okText={t('Clear key')}
        cancelText={t('Cancel')}
        okButtonProps={{ danger: true }}
      >
        {t('You will need to enter it again to use this provider.')}
      </Modal>
    </Modal>
  );
}
