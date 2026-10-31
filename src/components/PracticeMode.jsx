import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Modal, Typography, message } from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BookFilled,
  BookOutlined,
  CopyOutlined,
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
import {
  emptyAnswer,
  isAnswerComplete,
  isAnswerCorrect,
  formatQuestionText,
} from '../utils/questionModel';
import { questionFingerprint, sessionKey } from '../utils/studySession';
import { resolveCheckpoint } from '../utils/quizProgress';
import { scrollToTop } from '../utils/scroll';

const { Title, Text, Paragraph } = Typography;

export default function PracticeMode({
  questions,
  quizId,
  sessionId,
  quizName,
  initialQuestionIndex = null,
  fresh,
  entryToken,
  adjustedCheckpoint,
  progressState,
  onExit,
  onBackToSummary,
}) {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const signature = useMemo(() => questionFingerprint(questions), [questions]);
  const create = () => ({ signature, answers: questions.map(emptyAnswer), index: 0 });
  const [session, setSession, draftSaved] = useStudySession(
    sessionKey(user?.uid, sessionId, 'practice'),
    questions,
    'practice',
    create,
    { fresh, initialIndex: initialQuestionIndex, entryToken }
  );
  const [messageApi, holder] = message.useMessage();
  const [modal, modalHolder] = Modal.useModal();
  const [saveAction, setSaveAction] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [copying, setCopying] = useState(false);
  const account = useRef(user?.uid);
  account.current = user?.uid;
  const question = questions[session.index];
  const answer = session.answers[session.index];
  const complete = isAnswerComplete(question, answer);
  const ai = useExplanation(question, user?.uid);
  const saved = resolveCheckpoint(questions, progressState.progress[quizId]);
  const isSaved = saved?.index === session.index && !saved.adjusted;
  const answeredCount = session.answers.filter((value, index) =>
    isAnswerComplete(questions[index], value)
  ).length;
  const go = (index) => {
    setSession((previous) => ({ ...previous, index }));
    scrollToTop();
  };
  const copy = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(formatQuestionText(question));
      messageApi.success(t('Question copied!'));
    } catch {
      messageApi.error(t('Could not copy. Please select and copy the question manually.'));
    } finally {
      setCopying(false);
    }
  };
  const save = async () => {
    if (!saveAction || account.current !== saveAction.uid) return;
    setSaveError(null);
    try {
      await progressState.save(quizId, saveAction.index, saveAction.questionId);
      if (account.current === saveAction.uid) {
        setSaveAction(null);
        messageApi.success(t('Position saved'));
      }
    } catch (error) {
      if (account.current === saveAction.uid && error.code !== 'SESSION_CHANGED')
        setSaveError(t('Could not save progress. Please retry.'));
    }
  };
  return (
    <div className="study-page">
      {holder}
      {modalHolder}
      <div className="study-heading">
        <div>
          <Button type="text" icon={<ArrowLeftOutlined aria-hidden="true" />} onClick={onExit}>
            {t('Back to quiz overview')}
          </Button>
          <Title level={1}>{t('Practice')}</Title>
          <Text type="secondary">{quizName}</Text>
        </div>
        {onBackToSummary && <Button onClick={onBackToSummary}>{t('Back to summary')}</Button>}
      </div>
      {adjustedCheckpoint && (
        <Alert
          type="info"
          showIcon
          message={t('Quiz content changed. Your saved position has been adjusted.')}
        />
      )}
      {progressState.error && quizId && (
        <Alert
          type="warning"
          showIcon
          message={t('Could not load saved progress.')}
          action={<Button onClick={progressState.reload}>{t('Retry')}</Button>}
        />
      )}
      <div className="study-workspace">
        <div className="study-main">
          <div className="study-position">
            <Text strong>
              {t('Question {number} of {total}', {
                number: session.index + 1,
                total: questions.length,
              })}
            </Text>
            <Text type="secondary">
              {t('{count} of {total} answered', { count: answeredCount, total: questions.length })}
            </Text>
          </div>
          <Question
            data={question}
            question={question.question}
            imageUrl={question.imageUrl}
            options={question.options}
            selectedAnswer={answer}
            onSelectAnswer={(value) =>
              setSession((previous) => ({
                ...previous,
                answers: previous.answers.map((item, index) =>
                  index === previous.index ? value : item
                ),
              }))
            }
            showFeedback={complete}
            isCorrect={isAnswerCorrect(question, answer)}
            correctOptions={question.answer}
          />
          <div className="study-secondary-actions">
            <Button
              icon={<QuestionCircleOutlined aria-hidden="true" />}
              onClick={() => ai.explain()}
              ref={ai.triggerRef}
            >
              {t('Explain')}
            </Button>
            <Button icon={<CopyOutlined aria-hidden="true" />} onClick={copy} loading={copying}>
              {t('Copy')}
            </Button>
            <Button
              icon={
                isSaved ? <BookFilled aria-hidden="true" /> : <BookOutlined aria-hidden="true" />
              }
              disabled={
                !isAuthenticated ||
                !quizId ||
                isSaved ||
                progressState.loading ||
                !!progressState.error ||
                !!progressState.pendingQuiz
              }
              onClick={() => {
                setSaveError(null);
                setSaveAction({ uid: user.uid, index: session.index, questionId: question.id });
              }}
            >
              {t(isSaved ? 'Position saved' : 'Save position')}
            </Button>
          </div>
          {!isAuthenticated && (
            <Paragraph type="secondary" className="study-hint">
              {t('Sign in to save a cloud checkpoint.')}
            </Paragraph>
          )}
          {isAuthenticated && !quizId && (
            <Paragraph type="secondary" className="study-hint">
              {t('Cloud checkpoints are available for library quizzes.')}
            </Paragraph>
          )}
          <ExplanationDialogs question={question} state={ai} inline />
          <div className="study-navigation-bar" role="group" aria-label={t('Practice')}>
            <Button
              icon={<ArrowLeftOutlined aria-hidden="true" />}
              disabled={session.index === 0}
              onClick={() => go(session.index - 1)}
            >
              {t('Previous')}
            </Button>
            <Button
              type="primary"
              icon={<ArrowRightOutlined aria-hidden="true" />}
              disabled={session.index === questions.length - 1}
              onClick={() => go(session.index + 1)}
            >
              {t('Next question')}
            </Button>
          </div>
          <div className="draft-status">
            <Text type="secondary" role="status">
              {t(
                draftSaved
                  ? 'Draft saved in this tab'
                  : 'Draft storage is unavailable in this browser.'
              )}
            </Text>
            <Button
              type="text"
              icon={<ReloadOutlined aria-hidden="true" />}
              onClick={() =>
                modal.confirm({
                  title: t('Reset this practice session?'),
                  content: t('Your cloud checkpoint is kept.'),
                  okText: t('Start practice'),
                  cancelText: t('Cancel'),
                  onOk: () => {
                    setSession((previous) => ({
                      ...create(),
                      freshToken: previous.freshToken,
                      entryToken: previous.entryToken,
                    }));
                    scrollToTop();
                  },
                })
              }
            >
              {t('Start a new practice session')}
            </Button>
          </div>
        </div>
        <QuestionNavigator
          questions={questions}
          answers={session.answers}
          index={session.index}
          onNavigate={go}
        />
      </div>
      <Modal
        title={t('Save position?')}
        open={!!saveAction}
        onOk={save}
        onCancel={() => setSaveAction(null)}
        confirmLoading={!!progressState.pendingQuiz}
        okText={t('Save')}
        cancelText={t('Cancel')}
      >
        <Paragraph>
          {t('Save question {number} as your cloud checkpoint?', {
            number: (saveAction?.index ?? 0) + 1,
          })}
        </Paragraph>
        <Paragraph type="secondary">{t('Other quiz checkpoints are kept.')}</Paragraph>
        {saveError && <Alert type="error" showIcon message={saveError} />}
      </Modal>
    </div>
  );
}
