import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal, Typography } from 'antd';
import {
  ArrowRightOutlined,
  BookOutlined,
  CloudSyncOutlined,
  GithubOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import './SignInModal.css';

const { Title, Text, Paragraph } = Typography;

export default function SignInModal({ open, onClose, onSignIn, busy, error }) {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!open) setReady(false);
  }, [open]);
  return (
    <Modal
      title={<span className="sr-only">{t('Sign in')}</span>}
      open={open}
      afterOpenChange={setReady}
      onCancel={onClose}
      footer={null}
      centered
      width={460}
      className="sign-in-modal"
    >
      <div className="sign-in-content">
        <div className="sign-in-brand">
          <span className="sign-in-brand-mark">
            <BookOutlined aria-hidden="true" />
          </span>
          <div>
            <strong>Quiz App</strong>
            <Text type="secondary">{t('Your study space')}</Text>
          </div>
        </div>
        <div className="sign-in-intro">
          <Title level={2}>{t('Pick up where you left off.')}</Title>
          <Paragraph type="secondary">
            {t('Sign in to save your checkpoints and make the most of every practice session.')}
          </Paragraph>
        </div>
        {error && <Alert showIcon type="error" role="alert" message={t(error)} />}
        <div className="sign-in-providers">
          <Button
            className="provider-sign-in google-sign-in"
            size="large"
            icon={
              <img
                className="sign-in-logo"
                src={import.meta.env.BASE_URL + 'providers/google.png'}
                alt=""
                width="20"
                height="20"
              />
            }
            block
            loading={busy}
            disabled={busy || !ready}
            onClick={onSignIn}
          >
            {t('Continue with Google')}
          </Button>
          <Button
            className="provider-sign-in"
            size="large"
            block
            disabled
            icon={<GithubOutlined aria-hidden="true" />}
          >
            <span className="sign-in-provider-label">
              <span className="desktop-copy">{t('Continue with GitHub')}</span>
              <span className="mobile-copy">GitHub</span>
            </span>
            <span className="sign-in-unavailable">{t('Unavailable')}</span>
          </Button>
          <Button
            className="provider-sign-in"
            size="large"
            block
            disabled
            icon={
              <img
                className="sign-in-logo"
                src={import.meta.env.BASE_URL + 'providers/microsoft.ico'}
                alt=""
                width="20"
                height="20"
              />
            }
          >
            <span className="sign-in-provider-label">
              <span className="desktop-copy">{t('Continue with Microsoft')}</span>
              <span className="mobile-copy">Microsoft</span>
            </span>
            <span className="sign-in-unavailable">{t('Unavailable')}</span>
          </Button>
        </div>
        <ul className="sign-in-benefits">
          <li>
            <CloudSyncOutlined aria-hidden="true" />
            <span>{t('Resume saved checkpoints across devices')}</span>
          </li>
          <li>
            <QuestionCircleOutlined aria-hidden="true" />
            <span>{t('Get AI explanations with your own API key')}</span>
          </li>
        </ul>
        <div className="sign-in-guest">
          <Text type="secondary">{t('The quiz bank is always open to guests.')}</Text>
          <Button type="text" block onClick={onClose}>
            {t('Continue as guest')}
            <ArrowRightOutlined aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
