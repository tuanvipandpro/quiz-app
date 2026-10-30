import React, { useRef, useState } from 'react';
import { Alert, Button, Card, Empty, Input, Modal, Spin, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { CUSTOM_QUIZ_LIMIT, MAX_CUSTOM_TITLE } from '../data/customQuizLimits';
import { CUSTOM_QUIZ_MESSAGES, normalizeCustomError } from '../utils/customQuizModel';

const { Title, Text, Paragraph } = Typography;

export default function CloudQuizLibrary({
  cloud,
  signedIn,
  onSignIn,
  onOpen,
  onReplace,
  onManage,
}) {
  const { t } = useLanguage();
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState(null);
  const focusAfterDelete = useRef(false);
  const open = (kind, quiz) => {
    onManage?.();
    setError(null);
    setDialog({ kind, quiz, title: quiz.title });
  };
  const confirm = async () => {
    setError(null);
    try {
      if (dialog.kind === 'rename') await cloud.rename(dialog.quiz, dialog.title);
      else {
        await cloud.remove(dialog.quiz);
        focusAfterDelete.current = true;
      }
      setDialog(null);
    } catch (failure) {
      setError(normalizeCustomError(failure));
    }
  };
  return (
    <section className="cloud-quiz-library" aria-labelledby="saved-quizzes-heading">
      <div className="cloud-quiz-heading">
        <div className="cloud-quiz-heading-copy">
          <Title id="saved-quizzes-heading" level={2} tabIndex={-1}>
            {t('Saved quizzes')}
          </Title>
          {signedIn && !cloud.error && !cloud.loading && (
            <Text type="secondary">
              {t('{count}/{limit} saved quizzes', {
                count: cloud.quizzes.length,
                limit: CUSTOM_QUIZ_LIMIT,
              })}
            </Text>
          )}
        </div>
        {signedIn && (
          <Button
            disabled={!!cloud.pending || cloud.loading}
            onClick={cloud.reload}
            aria-label={t('Reload saved quizzes')}
            icon={<ReloadOutlined aria-hidden="true" />}
          >
            <span className="desktop-copy">{t('Reload saved quizzes')}</span>
          </Button>
        )}
      </div>
      {!signedIn ? (
        <Alert
          showIcon
          type="info"
          message={t('Sign in to save and manage your private quizzes.')}
          description={t(
            'Guest uploads stay in this tab. Saving to your account is always your choice.'
          )}
          action={<Button onClick={onSignIn}>{t('Sign in')}</Button>}
        />
      ) : cloud.loading ? (
        <div role="status" className="cloud-quiz-loading">
          <Spin /> {t('Loading saved quizzes…')}
        </div>
      ) : cloud.error ? (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={t(CUSTOM_QUIZ_MESSAGES[cloud.error.code] || CUSTOM_QUIZ_MESSAGES.CUSTOM_NETWORK)}
          action={<Button onClick={cloud.reload}>{t('Retry')}</Button>}
        />
      ) : (
        <>
          {!cloud.quizzes.length && (
            <Empty description={t('No saved quizzes yet. Upload a file below to get started.')} />
          )}
          {cloud.quizzes.length === CUSTOM_QUIZ_LIMIT && (
            <Alert type="info" showIcon message={t(CUSTOM_QUIZ_MESSAGES.CUSTOM_QUOTA)} />
          )}
          <div className="cloud-quiz-list">
            {cloud.quizzes.map((quiz) => (
              <Card className="cloud-quiz-card" key={quiz.instanceId}>
                <Title level={3}>{quiz.title}</Title>
                <Text type="secondary">
                  {t('{count} questions', { count: quiz.questionCount })}
                </Text>
                {quiz.invalid && (
                  <Alert
                    type="warning"
                    message={t('Saved content is invalid. Replace its JSON or delete this quiz.')}
                  />
                )}
                {quiz.checkpoint && (
                  <Paragraph className="cloud-quiz-checkpoint">
                    {t('Saved at question {number}', { number: quiz.checkpoint.questionIndex + 1 })}
                  </Paragraph>
                )}
                <div
                  className="cloud-quiz-actions"
                  role="group"
                  aria-label={t('Study {name}', { name: quiz.title })}
                >
                  <Button
                    type="primary"
                    disabled={quiz.invalid || !!cloud.pending}
                    onClick={() => onOpen(quiz, 'practice')}
                  >
                    {t('Practice')}
                  </Button>
                  <Button
                    disabled={quiz.invalid || !!cloud.pending}
                    onClick={() => onOpen(quiz, 'overview', false)}
                  >
                    {t('Mock exam')}
                  </Button>
                  {quiz.checkpoint && (
                    <Button
                      disabled={quiz.invalid || !!cloud.pending}
                      onClick={() => onOpen(quiz, 'practice', true)}
                    >
                      {t('Resume')}
                    </Button>
                  )}
                </div>
                <div
                  className="cloud-quiz-actions"
                  role="group"
                  aria-label={t('Manage {name}', { name: quiz.title })}
                >
                  <Button disabled={!!cloud.pending} onClick={() => open('rename', quiz)}>
                    {t('Rename')}
                  </Button>
                  <Button disabled={!!cloud.pending} onClick={() => onReplace(quiz)}>
                    {t('Replace JSON')}
                  </Button>
                  <Button danger disabled={!!cloud.pending} onClick={() => open('delete', quiz)}>
                    {t('Delete')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      <Modal
        className="cloud-quiz-modal"
        afterClose={() => {
          // A confirmed delete removes the trigger. Keep keyboard users at the list.
          if (focusAfterDelete.current || document.activeElement === document.body) {
            focusAfterDelete.current = false;
            const heading = document.getElementById('saved-quizzes-heading');
            heading?.focus({ preventScroll: true });
            heading?.scrollIntoView({ block: 'nearest' });
          }
        }}
        open={!!dialog}
        title={t(dialog?.kind === 'rename' ? 'Rename quiz' : 'Delete this quiz?')}
        onCancel={() => {
          if (!cloud.pending) setDialog(null);
        }}
        onOk={confirm}
        confirmLoading={!!cloud.pending}
        maskClosable={!cloud.pending}
        closable={!cloud.pending}
        cancelButtonProps={{ disabled: !!cloud.pending }}
        okButtonProps={{
          danger: dialog?.kind === 'delete',
          disabled: dialog?.kind === 'rename' && !dialog.title.trim(),
        }}
        okText={t(dialog?.kind === 'rename' ? 'Save name' : 'Delete')}
        cancelText={t('Cancel')}
      >
        {dialog?.kind === 'rename' ? (
          <label className="cloud-name-field">
            {t('Quiz name')}
            <Input
              autoFocus
              value={dialog.title}
              maxLength={MAX_CUSTOM_TITLE}
              disabled={!!cloud.pending}
              onChange={(event) =>
                setDialog((previous) => ({ ...previous, title: event.target.value }))
              }
            />
          </label>
        ) : (
          <>
            <Paragraph strong className="cloud-dialog-quiz-name">
              {dialog?.quiz.title}
            </Paragraph>
            <Paragraph>
              {t('This deletes the quiz and its saved progress. Other quizzes are kept.')}
            </Paragraph>
          </>
        )}
        {error && (
          <Alert
            type="error"
            role="alert"
            showIcon
            message={t(CUSTOM_QUIZ_MESSAGES[error.code] || CUSTOM_QUIZ_MESSAGES.CUSTOM_NETWORK)}
          />
        )}
      </Modal>
    </section>
  );
}
