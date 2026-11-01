import React from 'react';
import { Button } from 'antd';
import {
  ArrowRightOutlined,
  BookOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { FEATURED_QUIZ_IDS, findQuiz } from '../data/quizzes';
import { quizUrl } from '../utils/navigation';
import ProviderIdentity from './ProviderIdentity';

export default function LandingPage({ onNavigate }) {
  const { t } = useLanguage();
  const start = () => onNavigate('#/library');
  const features = [
    {
      icon: ThunderboltOutlined,
      title: 'Practice with purpose',
      text: 'Work through questions at your own pace. Review answers and explore explanations as you go.',
    },
    {
      icon: ClockCircleOutlined,
      title: 'Find your exam rhythm',
      text: 'Try a timed mock exam, then review the questions that deserve another look.',
    },
    {
      icon: BookOutlined,
      title: 'Connect the concepts',
      text: 'Use study guides available for supported banks to put individual answers into context.',
    },
  ];
  return (
    <div className="public-page landing-page">
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="public-eyebrow">
            <span className="eyebrow-dot" />
            {t('A little practice. A new possibility.')}
          </p>
          <h1>
            {t('Small quizzes.')}
            <br />
            <span>{t('Big confidence.')}</span>
          </h1>
          <p className="hero-description">
            {t(
              'Make room for your next certification. Practice questions, try mock exams, and turn what you learn into progress.'
            )}
          </p>
          <div className="public-actions">
            <Button
              type="primary"
              size="large"
              onClick={start}
              icon={<ArrowRightOutlined aria-hidden="true" />}
              iconPosition="end"
            >
              {t('Start practicing')}
            </Button>
            <Button
              size="large"
              type="text"
              onClick={() => {
                const heading = document.getElementById('landing-features');
                heading?.scrollIntoView({ block: 'start' });
                heading?.focus({ preventScroll: true });
              }}
            >
              {t('Take a look around')}
            </Button>
          </div>
          <p className="hero-footnote">
            <CheckOutlined aria-hidden="true" />
            {t('Jump into the quiz bank. No account needed to start.')}
          </p>
        </div>
        <div className="hero-visual">
          <div className="orbit orbit-one" aria-hidden="true" />
          <div className="orbit orbit-two" aria-hidden="true" />
          <article className="quiz-preview" aria-label={t('Product preview')}>
            <div className="preview-top">
              <span>{t('A moment of practice')}</span>
              <span className="preview-label">{t('Illustration')}</span>
            </div>
            <div className="preview-progress" aria-hidden="true">
              <span />
            </div>
            <p className="preview-question">
              {t('How do big goals become a little more achievable?')}
            </p>
            <div className="preview-option">
              <span aria-hidden="true">A</span>
              {t('Wait for the perfect moment')}
            </div>
            <div className="preview-option is-selected">
              <span aria-hidden="true">
                <CheckOutlined />
              </span>
              {t('Take it one question at a time')}
            </div>
            <div className="preview-note">
              <span className="preview-spark" aria-hidden="true">
                <ThunderboltOutlined />
              </span>
              <p>
                <strong>{t('Keep your curiosity going.')}</strong>
                <br />
                {t('Learn. Review. Give it another try.')}
              </p>
            </div>
          </article>
          <span className="orbit-caption" aria-hidden="true">
            QUIZMOS · YOUR LEARNING ORBIT
          </span>
        </div>
      </section>

      <section className="landing-features" aria-labelledby="landing-features">
        <div className="public-section-heading">
          <p className="public-eyebrow">{t('YOUR PACE. YOUR PATH.')}</p>
          <h2 id="landing-features" tabIndex={-1}>
            {t('A study space that moves with you.')}
          </h2>
          <p>{t('A quick practice session or a focused exam run. Pick what you need today.')}</p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text }, index) => (
            <article className="feature-card" key={title}>
              <div className="feature-top">
                <span className="feature-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="feature-number" aria-hidden="true">
                  0{index + 1}
                </span>
              </div>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-banks" aria-labelledby="featured-heading">
        <div className="public-section-heading bank-section-heading">
          <div>
            <p className="public-eyebrow">{t('FIND YOUR NEXT CHALLENGE')}</p>
            <h2 id="featured-heading">{t('A place to begin.')}</h2>
          </div>
          <Button
            type="text"
            onClick={start}
            icon={<ArrowRightOutlined aria-hidden="true" />}
            iconPosition="end"
          >
            {t('Explore the quiz bank')}
          </Button>
        </div>
        <div className="featured-public-grid">
          {FEATURED_QUIZ_IDS.map((id) => {
            const quiz = findQuiz(id);
            return (
              <article key={id} className="public-bank-card">
                <ProviderIdentity provider={quiz.category} />
                <h3>{quiz.code}</h3>
                <p>{quiz.name}</p>
                <Button
                  onClick={() => onNavigate(quizUrl(id))}
                  icon={<ArrowRightOutlined aria-hidden="true" />}
                  iconPosition="end"
                >
                  {t('Explore {code}', { code: quiz.code })}
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-final">
        <p className="public-eyebrow">{t('ONE QUESTION IS A START')}</p>
        <h2>{t('Make your next study session count.')}</h2>
        <Button
          type="primary"
          size="large"
          onClick={start}
          icon={<ArrowRightOutlined aria-hidden="true" />}
          iconPosition="end"
        >
          {t('Open the quiz bank')}
        </Button>
        <p className="support-invitation">
          {t('Enjoying QuizMos?')}{' '}
          <button className="public-text-link" onClick={() => onNavigate('#/donate')}>
            <HeartOutlined aria-hidden="true" />
            {t('Support the project')}
          </button>
        </p>
      </section>
    </div>
  );
}
