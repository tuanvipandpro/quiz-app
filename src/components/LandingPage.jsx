import React from 'react';
import { Button } from 'antd';
import {
  ArrowRightOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
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
import AppFooter from './AppFooter';
import { useLandingSections } from '../hooks/useLandingSections';

export default function LandingPage({ onNavigate }) {
  const { t } = useLanguage();
  const sections = useLandingSections();
  const sectionLabels = ['Introduction', 'How it works', 'Featured banks', 'Get started'];
  const panelClass = (index) =>
    'landing-panel' + (sections.seen.includes(index) ? ' is-revealed' : '');
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
    <div
      ref={sections.rootRef}
      className="public-page landing-page"
      data-ready={sections.ready}
      data-active={sections.active}
      data-motion={sections.reducedMotion ? 'reduce' : 'normal'}
    >
      <section className={panelClass(0) + ' landing-hero'} aria-labelledby="landing-intro">
        <div className="panel-inner hero-inner">
          <div className="hero-copy panel-reveal">
            <p className="public-eyebrow">
              <span className="eyebrow-dot" />
              {t('A little practice. A new possibility.')}
            </p>
            <h1 id="landing-intro" tabIndex={-1}>
              {t('Small quizzes.')}
              <br />
              <span>{t('Big confidence.')}</span>
            </h1>
            <p className="hero-description">
              {t(
                'Make room for your next certification. Practice questions, try mock exams, and turn what you learn into progress.'
              )}
            </p>
            <div className="public-actions hero-actions">
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
                className="hero-donate"
                icon={<HeartOutlined aria-hidden="true" />}
                onClick={() => onNavigate('#/donate')}
              >
                {t('Donate')}
              </Button>
            </div>
            <p className="hero-footnote">
              <CheckOutlined aria-hidden="true" />
              {t('Jump into the quiz bank. No account needed to start.')}
            </p>
          </div>
          <div className="hero-visual panel-reveal reveal-later">
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
          <button className="section-scroll-hint" onClick={() => sections.goToSection(1)}>
            <span className="scroll-hint-line" aria-hidden="true" />
            <span>{t('Take a look around')}</span>
            <ArrowDownOutlined aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className={panelClass(1) + ' landing-features'} aria-labelledby="landing-features">
        <div className="panel-inner">
          <span className="panel-index" aria-hidden="true">
            01 / LEARN
          </span>
          <div className="panel-reveal">
            <div className="public-section-heading">
              <p className="public-eyebrow">{t('YOUR PACE. YOUR PATH.')}</p>
              <h2 id="landing-features" tabIndex={-1}>
                {t('A study space that moves with you.')}
              </h2>
              <p>
                {t('A quick practice session or a focused exam run. Pick what you need today.')}
              </p>
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
          </div>
          <button
            className="section-scroll-hint panel-next"
            onClick={() => sections.goToSection(2)}
          >
            {t('Next: {section}', { section: t('Featured banks') })}
            <ArrowDownOutlined aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className={panelClass(2) + ' landing-banks'} aria-labelledby="featured-heading">
        <div className="panel-inner">
          <span className="panel-index" aria-hidden="true">
            02 / EXPLORE
          </span>
          <div className="panel-reveal">
            <div className="public-section-heading bank-section-heading">
              <div>
                <p className="public-eyebrow">{t('FIND YOUR NEXT CHALLENGE')}</p>
                <h2 id="featured-heading" tabIndex={-1}>
                  {t('A place to begin.')}
                </h2>
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
          </div>
          <button
            className="section-scroll-hint panel-next"
            onClick={() => sections.goToSection(3)}
          >
            {t('Next: {section}', { section: t('Get started') })}
            <ArrowDownOutlined aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className={panelClass(3) + ' landing-final'} aria-labelledby="landing-final-heading">
        <div className="panel-inner final-inner">
          <div className="final-content panel-reveal">
            <p className="public-eyebrow">{t('ONE QUESTION IS A START')}</p>
            <h2 id="landing-final-heading" tabIndex={-1}>
              {t('Make your next study session count.')}
            </h2>
            <div className="public-actions final-actions">
              <Button
                className="final-primary-action"
                size="large"
                onClick={start}
                icon={<ArrowRightOutlined aria-hidden="true" />}
                iconPosition="end"
              >
                {t('Open the quiz bank')}
              </Button>
              <Button
                size="large"
                className="final-donate-action"
                onClick={() => onNavigate('#/donate')}
                icon={<HeartOutlined aria-hidden="true" />}
              >
                {t('Donate')}
              </Button>
            </div>
            <p className="support-invitation">
              {t('Enjoying QuizMos?')}{' '}
              <button className="public-text-link" onClick={() => onNavigate('#/donate')}>
                <HeartOutlined aria-hidden="true" />
                {t('Support the project')}
              </button>
            </p>
          </div>
          <AppFooter onNavigate={onNavigate} page="home" embedded />
          <button
            className="section-scroll-hint final-back-top"
            onClick={() => sections.goToSection(0)}
          >
            {t('Back to top')}
            <ArrowUpOutlined aria-hidden="true" />
          </button>
        </div>
      </section>
      <nav className="landing-pagination" aria-label={t('Landing sections')}>
        {sectionLabels.map((label, index) => (
          <button
            key={label}
            onClick={() => sections.goToSection(index)}
            aria-label={t('Go to {section}', { section: t(label) })}
            aria-current={sections.active === index ? 'step' : undefined}
          >
            <span className="section-dot" aria-hidden="true" />
            <span className="section-dot-number" aria-hidden="true">
              0{index + 1}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
