import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Input, Spin, Tag, Typography } from 'antd';
import {
  ArrowRightOutlined,
  PlayCircleOutlined,
  ReadOutlined,
  SearchOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { FEATURED_QUIZ_IDS, PROVIDERS, quizzes, findQuiz } from '../data/quizzes';
import { getQuickSummary } from '../data/quickSummaries';
import { latestSavedQuiz } from '../utils/quizProgress';

const { Title, Text, Paragraph } = Typography;
const slug = (provider) => provider.toLowerCase().replaceAll(' ', '-');

export default function QuizLibrary({
  query,
  onQueryChange,
  expanded,
  onExpandedChange,
  progressState,
  onOpen,
}) {
  const { t } = useLanguage();
  const search = useRef(null);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const needle = query.trim().toLowerCase();
  const filtered = quizzes.filter((quiz) =>
    `${quiz.name} ${quiz.code} ${quiz.category}`.toLowerCase().includes(needle)
  );
  const latest = findQuiz(
    latestSavedQuiz(
      progressState.progress,
      quizzes.map((quiz) => quiz.id)
    )
  );
  const checkpointLabel = (checkpoint) =>
    Number.isInteger(checkpoint.questionIndex)
      ? t('Saved at question {number}', { number: checkpoint.questionIndex + 1 })
      : t('Saved position');
  const actions = (quiz, featured = false) => (
    <div className="library-quiz-actions">
      <Button
        type={featured ? 'primary' : 'default'}
        icon={<PlayCircleOutlined aria-hidden="true" />}
        onClick={() => onOpen(quiz, 'practice', !!progressState.progress[quiz.id])}
      >
        {t(progressState.progress[quiz.id] ? 'Resume' : 'Practice')}
      </Button>
      <Button onClick={() => onOpen(quiz, 'overview', false, 'exam')}>{t('Mock exam')}</Button>
      {getQuickSummary(quiz.id) && (
        <Button
          type="link"
          icon={<ReadOutlined aria-hidden="true" />}
          onClick={() => onOpen(quiz, 'summary')}
        >
          {t('Quick Summary')}
        </Button>
      )}
    </div>
  );
  const jumpToProvider = (provider) => {
    onExpandedChange((previous) => ({ ...previous, [provider]: true }));
    requestAnimationFrame(() =>
      document.getElementById('provider-' + slug(provider))?.scrollIntoView({ block: 'start' })
    );
  };
  return (
    <div className="quiz-library">
      <div className="page-heading">
        <span className="section-eyebrow">{t('Certification practice')}</span>
        <Title level={1}>{t('Quiz Bank')}</Title>
        <Paragraph type="secondary">
          {t('Start with a featured exam or explore each provider.')}
        </Paragraph>
      </div>
      <label className="library-search">
        <span>{t('Find a certification')}</span>
        <Input
          ref={search}
          size="large"
          prefix={<SearchOutlined aria-hidden="true" />}
          placeholder={t('Name, exam code or provider…')}
          value={query}
          allowClear
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      {!needle && (
        <>
          <section aria-labelledby="featured-heading" className="featured-section">
            <Title level={2} id="featured-heading">
              <StarOutlined aria-hidden="true" /> {t('Featured exams')}
            </Title>
            <div className="featured-grid">
              {FEATURED_QUIZ_IDS.map((id) => {
                const quiz = findQuiz(id);
                return (
                  <article key={id} className="featured-quiz">
                    <div className="library-row-heading">
                      <Text className="quiz-provider-label">{quiz.category}</Text>
                      <Tag>{t('Featured')}</Tag>
                    </div>
                    <Title level={3}>
                      <button className="quiz-title-link" onClick={() => onOpen(quiz, 'overview')}>
                        <span className="featured-exam-code">{quiz.code}</span>
                        <span className="featured-exam-name">
                          {quiz.name.replace(/\s*\([^)]+\)$/, '')}
                        </span>
                      </button>
                    </Title>
                    <Text type="secondary">
                      {t('{count} questions', { count: quiz.totalQuestions })} ·{' '}
                      {t(quiz.difficulty)}
                    </Text>
                    {actions(quiz, true)}
                  </article>
                );
              })}
            </div>
          </section>
          {latest && !progressState.error && (
            <section className="continue-learning" aria-label={t('Continue learning')}>
              <div>
                <Text className="quiz-provider-label">{t('Continue learning')}</Text>
                <Title level={3}>{latest.name}</Title>
                <Text type="secondary">{checkpointLabel(progressState.progress[latest.id])}</Text>
              </div>
              <Button
                type="primary"
                icon={<ArrowRightOutlined aria-hidden="true" />}
                onClick={() => onOpen(latest, 'practice', true)}
              >
                {t('Resume')}
              </Button>
            </section>
          )}
        </>
      )}
      {progressState.loading && (
        <div className="inline-status" role="status">
          <Spin size="small" /> {t('Checking saved progress…')}
        </div>
      )}
      {progressState.error && (
        <Alert
          type="warning"
          showIcon
          message={t('Could not load saved progress.')}
          action={<Button onClick={progressState.reload}>{t('Retry')}</Button>}
        />
      )}
      <div className="section-heading">
        <Title level={2}>{t(needle ? 'Search results' : 'Browse by provider')}</Title>
        <Text type="secondary" role="status">
          {t('{count} quiz sets', { count: filtered.length })}
        </Text>
      </div>
      <div className={'library-browser' + (!filtered.length ? ' is-empty' : '')}>
        {!!filtered.length && (
          <aside className="provider-rail">
            <Text className="provider-rail-label" type="secondary">
              {t('Providers')}
            </Text>
            <nav className="provider-jumps" aria-label={t('Browse by provider')}>
              {PROVIDERS.filter((provider) =>
                filtered.some((quiz) => quiz.category === provider)
              ).map((provider) => (
                <Button key={provider} onClick={() => jumpToProvider(provider)}>
                  {provider}
                  <span className="provider-count">
                    {filtered.filter((quiz) => quiz.category === provider).length}
                  </span>
                </Button>
              ))}
            </nav>
          </aside>
        )}
        <div className="provider-sections">
          {!filtered.length && (
            <Empty
              description={
                <>
                  <Title level={3}>{t('No matching quizzes')}</Title>
                  <Paragraph>{t('Try a different name or exam code.')}</Paragraph>
                  <Button
                    onClick={() => {
                      onQueryChange('');
                      search.current?.focus();
                    }}
                  >
                    {t('Clear search')}
                  </Button>
                </>
              }
            />
          )}
          {PROVIDERS.map((provider) => {
            const matches = filtered.filter((quiz) => quiz.category === provider);
            if (!matches.length) return null;
            const open = needle ? true : (expanded[provider] ?? !mobile);
            return (
              <details
                className="provider-group"
                id={'provider-' + slug(provider)}
                key={provider}
                open={open}
                onToggle={(event) => {
                  const next = event.currentTarget.open;
                  if (!needle && next !== open)
                    onExpandedChange((previous) => ({ ...previous, [provider]: next }));
                }}
              >
                <summary>
                  <h3>{provider}</h3>
                  <Text type="secondary">{t('{count} quiz sets', { count: matches.length })}</Text>
                </summary>
                <div>
                  {matches.map((quiz) => (
                    <article key={quiz.id} className="library-quiz-row">
                      <div>
                        <div className="library-row-heading">
                          <span className="exam-code">{quiz.code}</span>
                          <Title level={4}>
                            <button
                              className="quiz-title-link"
                              onClick={() => onOpen(quiz, 'overview')}
                            >
                              {quiz.name.replace(/\s*\([^)]+\)$/, '')}
                            </button>
                          </Title>
                          {FEATURED_QUIZ_IDS.includes(quiz.id) && <Tag>{t('Featured')}</Tag>}
                        </div>
                        <Text type="secondary">
                          {t('{count} questions', { count: quiz.totalQuestions })} ·{' '}
                          {t(quiz.difficulty)}
                          {progressState.progress[quiz.id] && (
                            <> · {checkpointLabel(progressState.progress[quiz.id])}</>
                          )}
                        </Text>
                      </div>
                      {actions(quiz)}
                    </article>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
