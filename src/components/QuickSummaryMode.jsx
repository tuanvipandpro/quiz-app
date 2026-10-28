import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, FloatButton, Space, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, ReadOutlined, ReloadOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext';
import { loadQuickSummary } from '../services/quickSummary.js';
import { getScrollTarget } from '../utils/scroll';
import './QuickSummaryMode.css';

const { Title, Text, Paragraph } = Typography;

export default function QuickSummaryMode({
  quizId,
  quizName,
  questions,
  onExit,
  onPracticeQuestion,
  initialScroll = 0,
}) {
  const { t } = useLanguage();
  const [state, setState] = useState({ loading: true, document: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setState({ loading: true, document: null, error: null });
    loadQuickSummary({
      quizId,
      questions,
      baseUrl: import.meta.env.BASE_URL,
      signal: controller.signal,
    })
      .then((document) => {
        if (current) setState({ loading: false, document, error: null });
      })
      .catch((error) => {
        if (current && error.name !== 'AbortError')
          setState({ loading: false, document: null, error: error.message });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [quizId, questions, attempt]);
  const guide = state.document;
  useEffect(() => {
    if (!guide || !initialScroll) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: initialScroll });
      document.body.scrollTo({ top: initialScroll });
    });
    return () => cancelAnimationFrame(frame);
  }, [guide, initialScroll]);
  const jumpTo = (id) =>
    document.getElementById('summary-' + id)?.scrollIntoView({ block: 'start' });
  const renderContents = () => (
    <ol className="quick-summary-contents">
      {guide.sections.map((section) => (
        <li key={section.id}>
          <button className="summary-section-link" onClick={() => jumpTo(section.id)}>
            {section.title}
          </button>
        </li>
      ))}
    </ol>
  );
  const markdownComponents = {
    a: ({ href, children }) =>
      href?.startsWith('#') ? (
        <a
          href={href}
          onClick={(event) => {
            event.preventDefault();
            jumpTo(href.slice(1).replace(/^summary-/, ''));
          }}
        >
          {children}
        </a>
      ) : (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ),
  };
  return (
    <div className="quick-summary">
      <div className="quick-summary-header">
        <div>
          <Text type="secondary" className="quick-summary-quiz-name">
            {quizName}
          </Text>
          <Title level={1}>
            <ReadOutlined aria-hidden="true" /> {t('Quick Summary')}
          </Title>
          {guide && (
            <Space wrap size={[8, 4]}>
              <Tag>{guide.meta.language === 'vi' ? 'Tiếng Việt' : guide.meta.language}</Tag>
              <Text type="secondary">
                {t('{minutes} min · {count} topics', {
                  minutes: guide.meta.readingMinutes,
                  count: guide.sections.length,
                })}
              </Text>
              <Text type="secondary">
                v{guide.meta.version} · {guide.meta.updatedAt}
              </Text>
            </Space>
          )}
        </div>
        <Button icon={<ArrowLeftOutlined aria-hidden="true" />} onClick={onExit}>
          {t('Back to quiz overview')}
        </Button>
      </div>
      {state.loading && (
        <div className="quick-summary-loading" role="status">
          <Spin />
          <Paragraph>{t('Loading Quick Summary…')}</Paragraph>
        </div>
      )}
      {state.error && (
        <Alert
          type="error"
          showIcon
          message={t('Quick Summary could not be loaded')}
          description={t(state.error)}
          action={
            <Button
              icon={<ReloadOutlined aria-hidden="true" />}
              onClick={() => setAttempt((value) => value + 1)}
            >
              {t('Retry')}
            </Button>
          }
        />
      )}
      {guide && (
        <>
          <Paragraph type="secondary" className="quick-summary-scope">
            {guide.meta.description}
          </Paragraph>
          {guide.sourceChanged && (
            <Alert
              className="quick-summary-stale"
              type="warning"
              showIcon
              message={t(
                'The question bank has changed since this guide was reviewed. Check the related questions.'
              )}
            />
          )}
          <div className="quick-summary-layout">
            <aside className="quick-summary-sidebar">
              <nav aria-label={t('Contents')}>
                <Text strong>{t('Contents')}</Text>
                {renderContents()}
              </nav>
            </aside>
            <div className="quick-summary-body">
              <details className="quick-summary-mobile-contents">
                <summary>
                  {t('Contents')} · {guide.sections.length}
                </summary>
                <nav aria-label={t('Contents')}>{renderContents()}</nav>
              </details>
              {guide.intro && (
                <div className="quick-summary-intro markdown-container">
                  <ReactMarkdown skipHtml components={markdownComponents}>
                    {guide.intro}
                  </ReactMarkdown>
                </div>
              )}
              {guide.sections.map((section, index) => {
                const related = section.questionIds
                  .map((id) => ({
                    id,
                    index: questions.findIndex((question) => String(question.id) === id),
                  }))
                  .filter((item) => item.index >= 0);
                return (
                  <Card
                    key={section.id}
                    className="quick-summary-topic"
                    id={'summary-' + section.id}
                  >
                    <Title level={2}>
                      {index + 1}. {section.title}
                    </Title>
                    <div className="markdown-container">
                      <ReactMarkdown skipHtml components={markdownComponents}>
                        {section.content}
                      </ReactMarkdown>
                    </div>
                    {related.length > 0 && (
                      <details className="quick-summary-practice">
                        <summary>
                          {t('Practise {count} related questions', { count: related.length })}
                        </summary>
                        <div className="quick-summary-questions">
                          {related.map((item) => (
                            <Button
                              key={item.id}
                              aria-label={t('Question {number}', { number: item.index + 1 })}
                              onClick={() => onPracticeQuestion(item.id)}
                            >
                              Q{item.index + 1}
                            </Button>
                          ))}
                        </div>
                      </details>
                    )}
                  </Card>
                );
              })}
              <details className="quick-summary-sources">
                <summary>{t('Sources')}</summary>
                <ul>
                  {guide.meta.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
          <FloatButton.BackTop
            className="quick-summary-back-top"
            aria-label={t('Back to top')}
            tooltip={t('Back to top')}
            target={getScrollTarget}
          />
        </>
      )}
    </div>
  );
}
