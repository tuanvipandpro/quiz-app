import React from 'react';
import { Avatar, Button, Card, Radio, Spin, Typography } from 'antd';
import { ArrowLeftOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';

const { Title, Paragraph, Text } = Typography;

export default function ProfilePage({
  user,
  loading,
  isDarkMode,
  onThemeChange,
  onSettings,
  onNavigate,
  onSignIn,
}) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="account-page">
      <Button
        type="text"
        icon={<ArrowLeftOutlined aria-hidden="true" />}
        onClick={() => onNavigate('#/library')}
      >
        {t('Back to library')}
      </Button>
      <div className="page-heading">
        <Title level={1}>{t('Profile')}</Title>
        <Paragraph type="secondary">{t('Your account and QuizMos settings.')}</Paragraph>
      </div>
      {loading ? (
        <div className="inline-status" role="status">
          <Spin />
          <Text>{t('Loading account…')}</Text>
        </div>
      ) : !user ? (
        <Card>
          <Title level={2}>{t('Sign in to view your profile')}</Title>
          <Paragraph>
            {t('Use your Google account to view your profile and manage your quizzes.')}
          </Paragraph>
          <Button type="primary" onClick={onSignIn}>
            {t('Sign in')}
          </Button>
        </Card>
      ) : (
        <div className="account-grid">
          <Card className="profile-identity">
            <div className="account-identity-heading">
              <Avatar size={64} src={user.photoURL} icon={<UserOutlined aria-hidden="true" />} />
              <div>
                <Title level={2}>{t('Google account')}</Title>
                <Text type="secondary">
                  {t('Identity is provided by Google and is read-only here.')}
                </Text>
              </div>
            </div>
            <dl className="profile-details">
              <dt>{t('Name')}</dt>
              <dd>{user.displayName || t('Not provided')}</dd>
              <dt>{t('Email')}</dt>
              <dd>{user.email || t('Not provided')}</dd>
            </dl>
            <div className="account-page-actions">
              <Button onClick={() => onNavigate('#/my-quizzes')}>{t('Manage quizzes')}</Button>
              <Button icon={<SettingOutlined aria-hidden="true" />} onClick={onSettings}>
                {t('AI Settings')}
              </Button>
            </div>
          </Card>
          <Card className="profile-preferences">
            <Title level={2}>{t('QuizMos settings')}</Title>
            <Paragraph type="secondary">
              {t(
                'Language and theme are saved on this device. They do not change your Google account or sync between devices.'
              )}
            </Paragraph>
            <div className="account-preference">
              <Text strong id="profile-language">
                {t('Language')}
              </Text>
              <Radio.Group
                role="radiogroup"
                aria-labelledby="profile-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                <Radio.Button value="en">English</Radio.Button>
                <Radio.Button value="vi">Tiếng Việt</Radio.Button>
              </Radio.Group>
            </div>
            <div className="account-preference">
              <Text strong id="profile-theme">
                {t('Theme')}
              </Text>
              <Radio.Group
                role="radiogroup"
                aria-labelledby="profile-theme"
                value={isDarkMode ? 'dark' : 'light'}
                onChange={(event) => onThemeChange(event.target.value)}
              >
                <Radio.Button value="light">{t('Light')}</Radio.Button>
                <Radio.Button value="dark">{t('Dark')}</Radio.Button>
              </Radio.Group>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
