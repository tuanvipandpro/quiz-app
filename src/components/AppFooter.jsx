import React from 'react';
import { Layout } from 'antd';
import { GithubOutlined } from '@ant-design/icons';
import { appBrand } from '../data/appBrand';
import { useLanguage } from '../contexts/LanguageContext';

export default function AppFooter({ onNavigate, page, embedded = false }) {
  const { t } = useLanguage();
  return (
    <Layout.Footer className={'app-footer' + (embedded ? ' landing-footer' : '')}>
      <span>
        {appBrand.name} · {t('Learn at your own pace.')}
      </span>
      <div className="footer-links">
        <button
          className="public-text-link"
          onClick={() => onNavigate('#/updates')}
          aria-current={page === 'updates' ? 'page' : undefined}
        >
          {t('Quiz updates')}
        </button>
        <button
          className="public-text-link"
          onClick={() => onNavigate('#/donate')}
          aria-current={page === 'donate' ? 'page' : undefined}
        >
          {t('Support QuizMos')}
        </button>
        <a
          href="https://github.com/tuanvipandpro/quiz-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GithubOutlined aria-hidden="true" /> {t('View on GitHub')}
        </a>
      </div>
    </Layout.Footer>
  );
}
