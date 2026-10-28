import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Modal, Radio, Space, Statistic, Typography } from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  FlagFilled,
  FlagOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import Question from './Question';
import QuestionNavigator from './QuestionNavigator';
import ExplanationDialogs from './ExplanationDialogs';
import { useExplanation } from '../hooks/useExplanation';
import { useStudySession } from '../hooks/useStudySession';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { createExamSession, examStats, finishExam, sessionKey } from '../utils/studySession';
import { isAnswerComplete, isAnswerCorrect } from '../utils/questionModel';
import { scrollToTop } from '../utils/scroll';

const { Title, Text, Paragraph } = Typography;

export default function ExamMode({
  questions,
  quizId,
  quizName,
  onExit,
  onRestart,
  onRunningChange,
  examTimeMinutes,
  examQuestionCount = 50,
  fresh,
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [session, setSession, draftSaved] = useStudySession(
    sessionKey(user?.uid, quizId, 'exam'),
    questions,
    'exam',
    () => createExamSession(questions, examQuestionCount, examTimeMinutes),
    { fresh }
  );
  const [submitOpen, setSubmitOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const stats = useMemo(() => examStats(session), [session]);
  const question = session.questions[session.index];
  const ai = useExplanation(question, user?.uid);
  const finish = (expired) => {
    setSubmitOpen(false);
    setSession((previous) => finishExam(previous, Date.now(), !expired));
  };
  useEffect(() => {
    onRunningChange(!session.submitted);
    return () => onRunningChange(false);
  }, [session.submitted, onRunningChange]);
  useEffect(() => {
    if (session.submitted) {
      setSubmitOpen(false);
      return;
    }
    const check = () => {
      if (Date.now() >= session.deadline) setSession((previous) => finishExam(previous));
    };
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [session.deadline, session.submitted, setSession]);
  const matches = (index, type) => {
    const answered = isAnswerComplete(session.questions[index], session.answers[index]);
    const correct = isAnswerCorrect(session.questions[index], session.answers[index]);
    return (
      type === 'all' ||
      (type === 'missed' && !correct) ||
      (type === 'correct' && correct) ||
      (type === 'incorrect' && answered && !correct) ||
      (type === 'unanswered' && !answered) ||
      (type === 'flagged' && session.flags.includes(index))
    );
  };
  const indexes = session.questions
    .map((_, index) => index)
    .filter((index) => !session.submitted || matches(index, filter));
  const go = (index) => {
    if (session.submitted && !matches(index, filter)) setFilter('all');
    setSession((previous) => ({ ...previous, index }));
    scrollToTop();
  };
  const selectFilter = (value) => {
    setFilter(value);
    const first = session.questions.findIndex((_, index) => matches(index, value));
    if (first >= 0) setSession((previous) => ({ ...previous, index: first }));
  };
  const position = indexes.indexOf(session.index);
  const answer = (value) =>
    setSession((previous) =>
      previous.submitted
        ? previous
        : Date.now() >= previous.deadline
          ? { ...previous, submitted: true, timeExpired: true }
          : {
              ...previous,
              answers: previous.answers.map((item, index) =>
                index === previous.index ? value : item
              ),
            }
    );
  const toggleFlag = () =>
    setSession((previous) => ({
      ...previous,
      flags: previous.flags.includes(previous.index)
        ? previous.flags.filter((index) => index !== previous.index)
        : [...previous.flags, previous.index],
    }));
  const score = (stats.correct / session.questions.length) * 100;
  return (
    <div className="study-page exam-page">
      <div className="study-heading">
        <div>
          <Button type="text" icon={<ArrowLeftOutlined aria-hidden="true" />} onClick={onExit}>
            {t('Back to quiz overview')}
          </Button>
          <Title level={1}>{t(session.submitted ? 'Exam results' : 'Mock exam')}</Title>
          <Text type="secondary">{quizName}</Text>
        </div>
      </div>
      {!session.submitted && (
        <div className="exam-timer exam-timer-sticky" role="timer" aria-label={t('Time remaining')}>
          <Text type="secondary">
            <ClockCircleOutlined aria-hidden="true" /> {t('Time remaining')}
          </Text>
          <Statistic.Timer
            type="countdown"
            value={session.deadline}
            format="HH:mm:ss"
            onFinish={() => finish(true)}
          />
        </div>
      )}
      {session.submitted && (
        <>
          {session.timeExpired && <Alert type="info" showIcon message={t('Time is up')} />}
          <section className="exam-score">
            <div>
              <Text type="secondary">{t('Score')}</Text>
              <div className="score-number">
                {stats.correct}
                <small> / {session.questions.length}</small>
              </div>
              <Text strong>
                {score.toFixed(1)}% · {t(score > 80 ? 'Pass' : 'Not passed')}
              </Text>
              <Paragraph type="secondary">{t('Passing requires more than 80%.')}</Paragraph>
            </div>
            <div className="score-stats">
              <div>
                <strong>{stats.correct}</strong>
                <span>{t('Correct')}</span>
              </div>
              <div>
                <strong>{stats.incorrect}</strong>
                <span>{t('Incorrect')}</span>
              </div>
              <div>
                <strong>{stats.unanswered}</strong>
                <span>{t('Unanswered')}</span>
              </div>
            </div>
            <Space wrap>
              <Button type="primary" onClick={() => selectFilter('missed')}>
                {t('Review missed questions')}
              </Button>
              <Button icon={<ReloadOutlined aria-hidden="true" />} onClick={onRestart}>
                {t('Start a new exam')}
              </Button>
            </Space>
          </section>
          <Radio.Group
            role="radiogroup"
            className="review-filters"
            value={filter}
            onChange={(event) => selectFilter(event.target.value)}
            aria-label={t('Exam results')}
          >
            {[
              ['all', 'All questions'],
              ['missed', 'Missed questions'],
              ['correct', 'Correct'],
              ['incorrect', 'Incorrect'],
              ['unanswered', 'Unanswered'],
              ['flagged', 'Flagged'],
            ].map(([value, label]) => (
              <Radio.Button key={value} value={value}>
                {t(label)}
              </Radio.Button>
            ))}
          </Radio.Group>
        </>
      )}
      <div className="study-workspace">
        <div className="study-main">
          {indexes.length ? (
            <>
              <div className="study-position">
                <Text strong>
                  {t('Question {number} of {total}', {
                    number: session.index + 1,
                    total: session.questions.length,
                  })}
                </Text>
                <Text type="secondary">
                  {t('{count} of {total} answered', {
                    count: stats.answered,
                    total: session.questions.length,
                  })}
                </Text>
              </div>
              <Question
                data={question}
                question={question.question}
                imageUrl={question.imageUrl}
                options={question.options}
                selectedAnswer={session.answers[session.index]}
                onSelectAnswer={answer}
                showFeedback={session.submitted}
                isCorrect={isAnswerCorrect(question, session.answers[session.index])}
                correctOptions={question.answer}
                readOnly={session.submitted}
                showOptionKey={false}
                sortOptions={false}
              />
              <div className="study-secondary-actions">
                {session.submitted ? (
                  <Button
                    icon={<QuestionCircleOutlined aria-hidden="true" />}
                    onClick={() => ai.explain()}
                  >
                    {t('Explain')}
                  </Button>
                ) : (
                  <>
                    <Button
                      icon={
                        session.flags.includes(session.index) ? (
                          <FlagFilled aria-hidden="true" />
                        ) : (
                          <FlagOutlined aria-hidden="true" />
                        )
                      }
                      aria-pressed={session.flags.includes(session.index)}
                      onClick={toggleFlag}
                    >
                      {t(session.flags.includes(session.index) ? 'Unflag' : 'Flag')}
                    </Button>
                    <Button type="primary" onClick={() => setSubmitOpen(true)}>
                      {t('Submit exam')}
                    </Button>
                  </>
                )}
              </div>
              {session.submitted && <ExplanationDialogs question={question} state={ai} inline />}
              <div
                className="study-navigation-bar"
                role="group"
                aria-label={t(session.submitted ? 'Exam results' : 'Mock exam')}
              >
                <Button
                  icon={<ArrowLeftOutlined aria-hidden="true" />}
                  disabled={position <= 0}
                  onClick={() => go(indexes[position - 1])}
                >
                  {t('Previous')}
                </Button>
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined aria-hidden="true" />}
                  disabled={position < 0 || position === indexes.length - 1}
                  onClick={() => go(indexes[position + 1])}
                >
                  {t('Next question')}
                </Button>
              </div>
            </>
          ) : (
            <Empty description={t('No questions match this filter.')} />
          )}
          <div className="draft-status">
            <Text type="secondary" role="status">
              {t(
                draftSaved
                  ? 'Draft saved in this tab'
                  : 'Draft storage is unavailable in this browser.'
              )}
            </Text>
          </div>
        </div>
        <QuestionNavigator
          questions={session.questions}
          answers={session.answers}
          index={session.index}
          onNavigate={go}
          flags={session.flags}
          review={session.submitted}
          indexes={indexes}
        />
      </div>
      <Modal
        title={t('Review before submitting')}
        open={submitOpen && !session.submitted}
        onCancel={() => setSubmitOpen(false)}
        onOk={() => finish(false)}
        okText={t('Submit and view results')}
        cancelText={t('Continue exam')}
      >
        <div className="submit-stats">
          <div>
            <strong>{stats.answered}</strong>
            <span>{t('Answered')}</span>
          </div>
          <div>
            <strong>{stats.unanswered}</strong>
            <span>{t('Unanswered')}</span>
          </div>
          <div>
            <strong>{session.flags.length}</strong>
            <span>{t('Flagged')}</span>
          </div>
        </div>
        <Paragraph>{t('Answers are locked after submission.')}</Paragraph>
        {stats.unanswered > 0 && (
          <Alert
            type="warning"
            showIcon
            message={t('You have {count} unanswered questions. They receive no points.', {
              count: stats.unanswered,
            })}
          />
        )}
      </Modal>
    </div>
  );
}
