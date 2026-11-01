import React from 'react';
import { Button, Modal, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';

export default function ApiKeyHelp({ open, onClose, provider, signedIn }) {
  const { t } = useLanguage();
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t('How to get a {provider} API key', { provider: provider.name })}
      width={480}
      className="ai-settings-modal ai-key-help"
      footer={<Button onClick={onClose}>{t('Done')}</Button>}
    >
      <ol>
        {provider.keySteps.map((step) => (
          <li key={step}>{t(step)}</li>
        ))}
      </ol>
      <a href={provider.keyHelpUrl} target="_blank" rel="noopener noreferrer">
        {t('Official setup guide')}
      </a>
      <Typography.Paragraph>{t('Save a key for one or both providers.')}</Typography.Paragraph>
      <Typography.Paragraph>
        {t(
          signedIn
            ? 'Keys are saved in your profile. Signing out keeps your saved keys.'
            : 'Guest keys stay in this browser and are cleared when your account changes.'
        )}
      </Typography.Paragraph>
      <Typography.Paragraph>
        {t(
          'Testing sends a small request and uses provider quota. Save the key to use it for explanations.'
        )}
      </Typography.Paragraph>
    </Modal>
  );
}
