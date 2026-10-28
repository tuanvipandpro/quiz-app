import React from 'react';
import { Alert, Button, Modal, Typography } from 'antd';
import {
  ArrowRightOutlined,
  BookOutlined,
  CloudSyncOutlined,
  GoogleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import './SignInModal.css';

const { Title, Text, Paragraph } = Typography;

export default function SignInModal({ open, onClose, onSignIn, busy, error }) {
  const { t } = useLanguage();
  return (
    <Modal
      title={<span className="sr-only">{t('Sign in')}</span>}
      open={open}
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
        <Button
          className="google-sign-in"
          size="large"
          icon={<GoogleOutlined aria-hidden="true" />}
          block
          loading={busy}
          disabled={busy}
          onClick={onSignIn}
        >
          {t('Continue with Google')}
        </Button>
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
