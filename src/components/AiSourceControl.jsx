import React, { useEffect, useState } from 'react';
import { Alert, Button, Radio, Typography } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useAiSource } from '../hooks/useAiSource';
import { useLanguage } from '../contexts/LanguageContext';
import appAiService from '../services/appAiService';

export function AiUsage({ usage }) {
  const { t, language } = useLanguage();
  if (!usage) return null;
  const reset = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(usage.resetAt));
  return (
    <div className="ai-usage" aria-live="polite">
      <Typography.Text strong>
        {t('{remaining}/{limit} App AI attempts left today', usage)}
      </Typography.Text>
      <Typography.Text type="secondary">{t('Resets at {time}', { time: reset })}</Typography.Text>
      {!usage.available && (
        <Alert
          showIcon
          type="info"
          message={t('App AI has reached its daily allowance. Please return after the reset.')}
        />
      )}
    </div>
  );
}

export default function AiSourceControl({ active = true, usage: providedUsage, onSignIn }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const { source, setSource, appAvailable } = useAiSource(uid);
  const { t } = useLanguage();
  const [quota, setQuota] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const request = new AbortController();
    setQuota(null);
    setError(null);
    if (active && appAvailable && source === 'app') {
      appAiService
        .usage(uid, request.signal)
        .then((result) => {
          if (!request.signal.aborted) setQuota(result);
        })
        .catch((failure) => {
          if (!request.signal.aborted) setError(failure.message);
        });
    }
    return () => request.abort();
  }, [active, appAvailable, source, uid]);
  return (
    <section className="ai-source-control" aria-label={t('AI source')}>
      {uid ? (
        <>
          <Typography.Text strong>{t('AI source')}</Typography.Text>
          <Radio.Group
            aria-label={t('AI source')}
            className="ai-source-options"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <Radio.Button value="app" disabled={!appAvailable}>
              {t('App AI')}
            </Radio.Button>
            <Radio.Button value="byok">{t('Your API key')}</Radio.Button>
          </Radio.Group>
          {!appAvailable && (
            <Typography.Text type="secondary">
              {t('App AI is being set up. You can use your own API key.')}
            </Typography.Text>
          )}
          {source === 'app' && (
            <>
              <AiUsage usage={providedUsage || quota} />
              <Typography.Text type="secondary">
                {t(
                  'New attempts use quota, including failed requests sent to the model. Saved results do not.'
                )}
              </Typography.Text>
            </>
          )}
        </>
      ) : (
        <div className="ai-sign-in-prompt">
          <Typography.Text>{t('App AI, no API key needed.')}</Typography.Text>
          <Button onClick={onSignIn} icon={<LoginOutlined aria-hidden="true" />}>
            {t('Sign in')}
          </Button>
        </div>
      )}
      {error && <Alert showIcon type="warning" role="alert" message={t(error)} />}
    </section>
  );
}
