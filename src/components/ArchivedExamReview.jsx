import React, { useState } from 'react';
import { Alert, Button, Card, Select, Space, Tag, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { getExamFeedbackMode } from '../data/examModes.js';
import { formatAnswerLines, isStructuredQuestion } from '../utils/questionModel.js';
import { scrollToTop } from '../utils/scroll';
import Question from './Question';
import StudyNavigation from './StudyNavigation';

const { Title, Text, Paragraph } = Typography;
const sourceLabels = {
  checking: 'Checking the original quiz…',
  current: 'The original quiz is still available.',
  changed: 'The source quiz changed. This review shows the saved version.',
  missing: 'The original quiz is no longer available. Your archived questions remain here.',
  replaced: 'The saved quiz slot has been reused. This archive belongs to the original quiz.',
  unavailable:
    'The original source status could not be checked. Archived content is still available.',
};
function ArchiveImage({ url }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <Alert
        className="archive-image-status"
        type="info"
        message={t(
          'The original illustration is unavailable. Saved question text remains available.'
        )}
      />
    );
  const src = /^(?:https?:|data:|blob:)/i.test(url)
    ? url
    : import.meta.env.BASE_URL + url.replace(/^\/+/, '');
  return (
    <img
      className="question-image"
      src={src}
      alt={t('Question illustration')}
      onError={() => setFailed(true)}
    />
  );
}
export default function ArchivedExamReview({
  record,
  sourceStatus,
  onNavigate,
  onDelete,
  dateLabel,
}) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const { summary, payload } = record,
    question = payload.questions[index],
    answer = payload.answers[index],
    outcome = payload.outcomes[index];
  const change = (value) => {
    setIndex(value);
    scrollToTop();
  };
  const score = ((summary.correct / summary.questionCount) * 100).toFixed(1);
  return (
    <div className="archived-exam-review">
      <div className="history-review-heading">
        <div>
          <Title level={2}>{summary.source.title}</Title>
          <Paragraph type="secondary">
            {t('Read-only saved exam. The recorded result is shown without regrading.')}
          </Paragraph>
        </div>
        <Button danger onClick={(event) => onDelete(summary, event.currentTarget)}>
          {t('Delete archive')}
        </Button>
      </div>
      <Card className="history-score">
        <div>
          <Text type="secondary">{t('Archived score')}</Text>
          <Title level={3}>
            {summary.correct} / {summary.questionCount} · {score}%
          </Title>
          <Tag color={summary.passed ? 'success' : 'default'}>
            {t(summary.passed ? 'Pass' : 'Not passed')}
          </Tag>
        </div>
        <dl>
          <dt>{t('Ended')}</dt>
          <dd>{dateLabel(summary.endedAt)}</dd>
          <dt>{t('Duration')}</dt>
          <dd>
            {summary.elapsedMs === null
              ? t('Duration unavailable')
              : t('{minutes} min {seconds} sec', {
                  minutes: Math.floor(summary.elapsedMs / 60000),
                  seconds: Math.floor(summary.elapsedMs / 1000) % 60,
                })}
          </dd>
          <dt>{t('Exam mode')}</dt>
          <dd>{t(getExamFeedbackMode(summary.feedbackMode).label)}</dd>
          <dt>{t('Recorded scoring policy')}</dt>
          <dd>{summary.gradingVersion}</dd>
          {summary.source.kind === 'custom' && (
            <>
              <dt>{t('Saved quiz version')}</dt>
              <dd>{summary.source.contentVersion}</dd>
            </>
          )}
        </dl>
      </Card>
      <Alert
        className="history-source-status"
        showIcon
        type={['changed', 'missing', 'replaced'].includes(sourceStatus?.state) ? 'warning' : 'info'}
        message={t(sourceLabels[sourceStatus?.state] || sourceLabels.checking)}
        action={
          sourceStatus?.url && (
            <Button onClick={() => onNavigate(sourceStatus.url)}>{t('Open current quiz')}</Button>
          )
        }
      />
      <label className="archive-question-picker">
        <Text strong>{t('Question')}</Text>
        <Select
          aria-label={t('Archived question')}
          value={index}
          onChange={change}
          showSearch={false}
          virtual={false}
          options={payload.questions.map((q, i) => ({
            value: i,
            label: t('Question {number} of {total}', {
              number: i + 1,
              total: payload.questions.length,
            }),
          }))}
        />
      </label>
      <div className="history-question-outcome">
        <Text strong>
          {t('Question {number} of {total}', {
            number: index + 1,
            total: payload.questions.length,
          })}
        </Text>
        <Tag color={outcome.correct ? 'success' : outcome.complete ? 'error' : 'default'}>
          {t(outcome.correct ? 'Correct' : outcome.complete ? 'Incorrect' : 'Unanswered')}
        </Tag>
      </div>
      {question.imageUrl?.trim() && (
        <ArchiveImage key={question.id + question.imageUrl} url={question.imageUrl} />
      )}
      <Question
        data={{ ...question, imageUrl: '' }}
        question={question.question}
        imageUrl=""
        options={question.options}
        selectedAnswer={
          !isStructuredQuestion(question) && question.answer.length === 1
            ? (answer[0] ?? null)
            : answer
        }
        correctOptions={question.answer}
        showFeedback={false}
        readOnly
        onSelectAnswer={() => {}}
        sortOptions={false}
      />
      <Card className="archive-answer-context">
        <Title level={3}>{t('Your saved answer')}</Title>
        {formatAnswerLines(question, answer, { showKeys: true }).length ? (
          formatAnswerLines(question, answer, { showKeys: true }).map((line, i) => (
            <Paragraph key={i}>{line}</Paragraph>
          ))
        ) : (
          <Paragraph>{t('Not answered')}</Paragraph>
        )}
        <Title level={3}>{t('Correct answer in this snapshot')}</Title>
        {formatAnswerLines(question, question.answer, { showKeys: true }).map((line, i) => (
          <Paragraph key={i}>{line}</Paragraph>
        ))}
      </Card>
      <StudyNavigation
        label={t('Archived question navigation')}
        previousDisabled={index === 0}
        nextDisabled={index === payload.questions.length - 1}
        onPrevious={() => change(index - 1)}
        onNext={() => change(index + 1)}
      />
      <Space wrap className="history-review-footer">
        <Text type="secondary">
          {t('Personal learning history, not an official exam credential.')}
        </Text>
      </Space>
    </div>
  );
}
