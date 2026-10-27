import React, { useEffect, useState } from 'react';
import { Button, InputNumber, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, FlagFilled } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { isAnswerComplete, isAnswerCorrect } from '../utils/questionModel';

const PAGE_SIZE = 40;

export default function QuestionNavigator({
  questions,
  answers,
  index,
  onNavigate,
  flags = [],
  review = false,
  indexes = questions.map((_, position) => position),
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(() => !window.matchMedia('(max-width: 900px)').matches);
  const [page, setPage] = useState(0);
  const [jump, setJump] = useState(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const changed = () => setOpen(!media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    setPage(Math.max(0, Math.floor(indexes.indexOf(index) / PAGE_SIZE)));
  }, [index, indexes.join(',')]);
  const count = questions.filter((question, position) =>
    isAnswerComplete(question, answers[position])
  ).length;
  const go = () => {
    if (jump >= 1 && jump <= questions.length) {
      onNavigate(jump - 1);
      setJump(null);
    }
  };
  return (
    <aside className="study-sidebar">
      <details
        className="study-navigator"
        open={open}
        onToggle={(event) => {
          if (event.currentTarget.open !== open) setOpen(event.currentTarget.open);
        }}
      >
        <summary>{t('Question navigator')}</summary>
        <Typography.Paragraph type="secondary">
          {t('{count} of {total} answered', { count, total: questions.length })}
        </Typography.Paragraph>
        <div className="question-number-grid">
          {indexes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((position) => {
            const answered = isAnswerComplete(questions[position], answers[position]);
            const correct = review && isAnswerCorrect(questions[position], answers[position]);
            const status = review
              ? correct
                ? 'Correct'
                : answered
                  ? 'Incorrect'
                  : 'Unanswered'
              : answered
                ? 'Answered'
                : 'Unanswered';
            return (
              <Button
                key={position}
                className={'question-number state-' + status.toLowerCase()}
                aria-current={position === index ? 'step' : undefined}
                aria-label={
                  t('Question {number}', { number: position + 1 }) +
                  ' · ' +
                  t(status) +
                  (flags.includes(position) ? ' · ' + t('Flagged') : '')
                }
                onClick={() => onNavigate(position)}
              >
                {position + 1}
                {flags.includes(position) ? (
                  <FlagFilled aria-hidden="true" />
                ) : correct || (answered && !review) ? (
                  <CheckOutlined aria-hidden="true" />
                ) : review && answered ? (
                  <CloseOutlined aria-hidden="true" />
                ) : null}
              </Button>
            );
          })}
        </div>
        {indexes.length > PAGE_SIZE && (
          <div className="navigator-pages">
            <Button
              size="small"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
              aria-label={t('Previous page')}
            >
              ←
            </Button>
            <Typography.Text type="secondary">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, indexes.length)} /{' '}
              {indexes.length}
            </Typography.Text>
            <Button
              size="small"
              disabled={(page + 1) * PAGE_SIZE >= indexes.length}
              onClick={() => setPage((value) => value + 1)}
              aria-label={t('Next page')}
            >
              →
            </Button>
          </div>
        )}
        <div className="navigator-jump">
          <label htmlFor="question-jump">{t('Go to question')}</label>
          <InputNumber
            id="question-jump"
            min={1}
            max={questions.length}
            value={jump}
            onChange={setJump}
            onPressEnter={go}
          />
          <Button
            onClick={go}
            disabled={!jump || jump < 1 || jump > questions.length}
            aria-label={t('Go to question')}
          >
            →
          </Button>
        </div>
      </details>
    </aside>
  );
}
