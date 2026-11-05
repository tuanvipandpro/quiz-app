import React from 'react';
import { Button, Layout, Spin } from 'antd';
import { HeartOutlined, LoginOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { appBrand } from '../data/appBrand';
import AccountMenu from './AccountMenu';
const { Header } = Layout;
export default function AppHeader({
  headerRef,
  page,
  onNavigate,
  isDarkMode,
  onToggleTheme,
  authLoading,
  user,
  onSettings,
  onSignOut,
  onSignIn,
}) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <Header ref={headerRef} className="app-header">
      <div className="app-header-inner">
        <button
          className="app-brand"
          aria-label={appBrand.name}
          onClick={() => onNavigate('#/')}
          aria-current={page === 'home' ? 'page' : undefined}
        >
          <img
            className="app-brand-logo"
            src={import.meta.env.BASE_URL + appBrand.logo}
            alt=""
            aria-hidden="true"
            width="32"
            height="32"
          />
          <span>{appBrand.name}</span>
        </button>
        <nav
          className="app-nav"
          aria-label={language === 'vi' ? 'Điều hướng chính' : 'Main navigation'}
        >
          <Button
            type="text"
            aria-current={['library', 'quiz'].includes(page) ? 'page' : undefined}
            onClick={() => onNavigate('#/library')}
          >
            {t('Quiz Bank')}
          </Button>
          <Button
            type="text"
            aria-current={page === 'my-quizzes' ? 'page' : undefined}
            onClick={() => onNavigate('#/my-quizzes')}
          >
            {t('My quizzes')}
          </Button>
          <Button
            type="text"
            className="header-donate"
            aria-current={page === 'donate' ? 'page' : undefined}
            onClick={() => onNavigate('#/donate')}
            icon={<HeartOutlined aria-hidden="true" />}
          >
            {t('Donate')}
          </Button>
        </nav>
        <div className="header-actions">
          <Button
            type="text"
            className="theme-toggle"
            icon={
              isDarkMode ? <SunOutlined aria-hidden="true" /> : <MoonOutlined aria-hidden="true" />
            }
            aria-label={t(isDarkMode ? 'Switch to light mode' : 'Switch to dark mode')}
            onClick={onToggleTheme}
          />
          <div className="language-toggle" role="group" aria-label={t('Language')}>
            <button
              aria-label="Tiếng Việt"
              aria-pressed={language === 'vi'}
              onClick={() => setLanguage('vi')}
            >
              VN
            </button>
            <button
              aria-label="English"
              aria-pressed={language === 'en'}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
          </div>
          {authLoading ? (
            <Spin size="small" />
          ) : user ? (
            <AccountMenu
              key={user.uid}
              user={user}
              onSettings={onSettings}
              onSignOut={onSignOut}
              onNavigate={onNavigate}
            />
          ) : (
            <Button
              type="text"
              aria-label={t('Sign in')}
              icon={<LoginOutlined aria-hidden="true" />}
              className="header-login"
              onClick={onSignIn}
            >
              <span>{t('Sign in')}</span>
            </Button>
          )}
        </div>
      </div>
    </Header>
  );
}
