import React from 'react';
import { Button } from 'antd';
import {
  ArrowRightOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  BookOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  HeartOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { FEATURED_QUIZ_IDS, findQuiz, quizzes, PROVIDERS } from '../data/quizzes';
import { quizUrl } from '../utils/navigation';
import ProviderIdentity from './ProviderIdentity';
import AppFooter from './AppFooter';
import { useLandingSections } from '../hooks/useLandingSections';
import RollingNumber from './RollingNumber';

export default function LandingPage({ onNavigate }) {
  const { t } = useLanguage();
  const sections = useLandingSections();
  const sectionLabels = ['Introduction', 'How it works', 'Featured banks', 'Get started'];
  const panelClass = (index) =>
    'landing-panel' +
    (sections.seen.includes(index) ? ' is-revealed' : '') +
    (sections.active === index ? ' is-current' : '');
  const start = () => onNavigate('#/library');
  const features = [
    {
      icon: ThunderboltOutlined,
      title: 'Practice with purpose',
      note: 'A few questions, whenever you have a moment.',
      text: 'Work through questions at your own pace. Review answers and explore explanations as you go.',
    },
    {
      icon: ClockCircleOutlined,
      title: 'Find your exam rhythm',
      note: 'A focused session with a clear finish line.',
      text: 'Try a timed mock exam, then review the questions that deserve another look.',
    },
    {
      icon: BookOutlined,
      title: 'Connect the concepts',
      note: 'The bigger picture behind individual answers.',
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
      <div className="landing-atmosphere" aria-hidden="true">
        {['blue', 'teal', 'violet', 'dusk'].map((tone) => (
          <span key={tone} className={'atmosphere-layer atmosphere-' + tone} />
        ))}
      </div>
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
          <div className="desktop-detail hero-catalog" aria-label={t('Explore the catalog')}>
            <div>
              <RollingNumber value={quizzes.length} reducedMotion={sections.reducedMotion} />
              <span>{t('Quiz banks to explore')}</span>
            </div>
            <div>
              <RollingNumber value={PROVIDERS.length} reducedMotion={sections.reducedMotion} />
              <span>{t('Certification providers')}</span>
            </div>
            <p>{t('Find a familiar topic. Discover your next challenge.')}</p>
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
              {features.map(({ icon: Icon, title, text, note }, index) => (
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
                  <p className="desktop-detail feature-note">{t(note)}</p>
                </article>
              ))}
            </div>
            <div className="desktop-detail study-path">
              <span className="study-path-label">{t('A simple rhythm for your next session')}</span>
              <ol>
                {['Choose a bank', 'Try the questions', 'Review and repeat'].map((step, index) => (
                  <li key={step}>
                    <span aria-hidden="true">0{index + 1}</span>
                    {t(step)}
                  </li>
                ))}
              </ol>
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
                    <div className="desktop-detail bank-facts">
                      <span>{t('{count} questions', { count: quiz.totalQuestions })}</span>
                      <span>{t('Practice & mock exams')}</span>
                    </div>
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
            <div className="desktop-detail provider-strip">
              <p>{t('More paths in the quiz bank')}</p>
              <div>
                {PROVIDERS.map((provider) => (
                  <ProviderIdentity key={provider} provider={provider} compact />
                ))}
              </div>
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
            <p className="desktop-detail final-description">
              {t(
                'You do not need to know everything today. Choose one topic, take a first step, and build from there.'
              )}
            </p>
            <div className="desktop-detail final-reassurance">
              {[
                'Start without an account',
                'Learn at your own pace.',
                'Switch between EN and VN',
              ].map((text) => (
                <span key={text}>
                  <CheckOutlined aria-hidden="true" />
                  {t(text)}
                </span>
              ))}
            </div>
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
                icon={<CoffeeOutlined aria-hidden="true" />}
              >
                {t('Donate')}
              </Button>
            </div>
            <p className="support-invitation">
              {t('Enjoying QuizMos?')}{' '}
              <button className="public-text-link" onClick={() => onNavigate('#/donate')}>
                <HeartOutlined aria-hidden="true" />
                {t('Buy us a coffee')}
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
