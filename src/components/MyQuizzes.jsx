import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Space, Typography, Upload } from 'antd';
import { CloudUploadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import {
  parseCustomQuizJSON,
  CUSTOM_QUIZ_MESSAGES,
  normalizeCustomError,
} from '../utils/customQuizModel';
import {
  MAX_CUSTOM_TITLE,
  MAX_QUIZ_FILE_BYTES,
  MAX_CUSTOM_QUIZ_BYTES,
} from '../data/customQuizLimits';
import QuestionFormatGuide from './QuestionFormatGuide';
import CloudQuizLibrary from './CloudQuizLibrary';

const { Title, Text, Paragraph } = Typography;

export default function MyQuizzes({
  upload,
  onUse,
  onOpen,
  onRemove,
  cloud,
  signedIn,
  onSignIn,
  onOpenCloud,
}) {
  const { t } = useLanguage();
  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState(null);
  const [reading, setReading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    []
  );
  const [modal, holder] = Modal.useModal();
  const beforeUpload = async (file) => {
    const revision = ++request.current;
    setError(null);
    setCandidate(null);
    setSaveError(null);
    setSaved(false);
    setReading(false);
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Only JSON files are supported.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_QUIZ_FILE_BYTES) {
      setError('The file is too large. Please use a file under 1 MiB.');
      return Upload.LIST_IGNORE;
    }
    setReading(true);
    try {
      const questions = parseCustomQuizJSON(await file.text());
      if (revision !== request.current) return Upload.LIST_IGNORE;
      setCandidate({
        id: 'custom',
        instanceId: crypto.randomUUID(),
        name: file.name.replace(/\.json$/i, '').slice(0, MAX_CUSTOM_TITLE),
        questions,
      });
    } catch (failure) {
      if (revision === request.current)
        setError(failure instanceof SyntaxError ? 'Invalid quiz file' : failure.message);
    } finally {
      if (revision === request.current) setReading(false);
    }
    return Upload.LIST_IGNORE;
  };
  const save = async (replace = false) => {
    if (!candidate || cloud.pending) return;
    const revision = request.current;
    setSaveError(null);
    try {
      const input = {
        title: candidate.name,
        questions: candidate.questions,
        instanceId: candidate.instanceId,
      };
      if (replace) await cloud.replace(replaceTarget, input);
      else await cloud.create(input);
      if (revision !== request.current) return;
      setSaved(true);
      setCandidate(null);
      setReplaceTarget(null);
      setReplaceOpen(false);
    } catch (failure) {
      if (revision === request.current) setSaveError(normalizeCustomError(failure));
    }
  };
  return (
    <div className="my-quizzes">
      {holder}
      <div className="page-heading">
        <span className="section-eyebrow">{t('Personal workspace')}</span>
        <Title level={1}>{t('My quizzes')}</Title>
        <Paragraph type="secondary">{t('Practise with your own questions.')}</Paragraph>
      </div>
      <CloudQuizLibrary
        cloud={cloud}
        signedIn={signedIn}
        onSignIn={onSignIn}
        onOpen={onOpenCloud}
        onManage={() => setSaved(false)}
        onReplace={(quiz) => {
          setReplaceTarget(quiz);
          setSaveError(null);
          setSaved(false);
          document.getElementById('custom-upload-heading')?.focus();
          document.getElementById('custom-upload-heading')?.scrollIntoView({ block: 'start' });
        }}
      />
      <Title id="custom-upload-heading" className="custom-upload-heading" level={2} tabIndex={-1}>
        {t('Upload a quiz')}
      </Title>
      <Alert
        showIcon
        type="info"
        className="upload-notice"
        message={t(
          signedIn
            ? 'Preview stays in this tab until you save it to your account.'
            : 'Only in this tab. Keep your JSON file.'
        )}
      />
      {saved && (
        <Alert
          role="status"
          type="success"
          showIcon
          message={t('Quiz saved. Available on your signed-in devices.')}
        />
      )}
      {replaceTarget && (
        <Alert
          type="info"
          showIcon
          message={t('Replacing {name}', { name: replaceTarget.title })}
          description={t(
            'Choose a JSON file below, then confirm the replacement. Saved progress will reset.'
          )}
          action={
            <Button
              disabled={!!cloud.pending}
              onClick={() => {
                setReplaceTarget(null);
                setSaveError(null);
              }}
            >
              {t('Cancel')}
            </Button>
          }
        />
      )}
      <ol className="upload-workflow" aria-label={t('Upload steps')}>
        {['Upload', 'Review', 'Study'].map((label, index) => (
          <li
            key={label}
            aria-current={(candidate ? 1 : upload ? 2 : 0) === index ? 'step' : undefined}
          >
            <span aria-hidden="true">{index + 1}</span>
            {t(label)}
          </li>
        ))}
      </ol>
      {upload && (
        <Card className="uploaded-quiz">
          <div className="section-heading">
            <div>
              <Title level={3}>{upload.name}</Title>
              <Text type="secondary">
                {t('{count} questions', { count: upload.questions.length })}
              </Text>
            </div>
            <Space wrap>
              <Button type="primary" onClick={() => onOpen('practice')}>
                {t('Practice')}
              </Button>
              <Button onClick={() => onOpen('overview')}>{t('Mock exam')}</Button>
              <Button
                danger
                onClick={() =>
                  modal.confirm({
                    title: t('Remove this upload?'),
                    content: t('You can upload the original file again.'),
                    okText: t('Remove'),
                    cancelText: t('Cancel'),
                    onOk: onRemove,
                  })
                }
              >
                {t('Remove')}
              </Button>
            </Space>
          </div>
        </Card>
      )}
      <div className="upload-layout">
        <div>
          <Upload.Dragger
            accept=".json,application/json"
            multiple={false}
            showUploadList={false}
            beforeUpload={beforeUpload}
            disabled={reading || !!cloud.pending}
          >
            <CloudUploadOutlined aria-hidden="true" className="upload-icon" />
            <Title level={3}>
              <span className="desktop-copy">{t('Drop a JSON file here, or choose a file')}</span>
              <span className="mobile-copy">{t('Upload your quiz')}</span>
            </Title>
            <Paragraph>{t('JSON · 1–100 questions · Max 1 MiB')}</Paragraph>
            <Button
              loading={reading}
              disabled={reading || !!cloud.pending}
              aria-label={t('Choose JSON file')}
              aria-busy={reading}
            >
              {t('Choose JSON file')}
            </Button>
          </Upload.Dragger>
          <Space wrap className="upload-help">
            <Button
              icon={<DownloadOutlined aria-hidden="true" />}
              href={import.meta.env.BASE_URL + 'sample-quiz.json'}
              download="sample-quiz.json"
            >
              {t('Sample JSON')}
            </Button>
            <Button
              icon={<FileTextOutlined aria-hidden="true" />}
              aria-controls="question-format-guide"
              onClick={() => {
                const guide = document.getElementById('question-format-guide');
                guide?.focus({ preventScroll: true });
                guide?.scrollIntoView({ block: 'start' });
              }}
            >
              {t('Format guide')}
            </Button>
          </Space>
          {error && (
            <Alert
              type="error"
              showIcon
              role="alert"
              message={t('Invalid quiz file')}
              description={t(error)}
            />
          )}
        </div>
        <Card title={t('Preview')} className={'upload-preview' + (!candidate ? ' is-empty' : '')}>
          {candidate ? (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <label>
                {t('Quiz name')}
                <Input
                  value={candidate.name}
                  maxLength={MAX_CUSTOM_TITLE}
                  disabled={!!cloud.pending}
                  onChange={(event) =>
                    setCandidate((previous) => ({ ...previous, name: event.target.value }))
                  }
                />
              </label>
              <Text>{t('{count} questions', { count: candidate.questions.length })}</Text>
              <Paragraph ellipsis={{ rows: 4 }}>{candidate.questions[0].question}</Paragraph>
              {saveError && (
                <Alert
                  type="error"
                  role="alert"
                  showIcon
                  message={t(
                    CUSTOM_QUIZ_MESSAGES[saveError.code] || CUSTOM_QUIZ_MESSAGES.CUSTOM_NETWORK
                  )}
                  description={saveError.detail ? t(saveError.detail) : undefined}
                  action={
                    saveError.code === 'CUSTOM_CONFLICT' ? (
                      <Button onClick={cloud.reload}>{t('Reload saved quizzes')}</Button>
                    ) : undefined
                  }
                />
              )}
              {signedIn && (
                <Text type="secondary">
                  {t('Cloud save limit: {limit} KiB. Larger quizzes can be used in this tab.', {
                    limit: MAX_CUSTOM_QUIZ_BYTES / 1024,
                  })}
                </Text>
              )}
              {signedIn ? (
                <Button
                  type="primary"
                  loading={!!cloud.pending}
                  disabled={!candidate.name.trim() || cloud.loading || !!cloud.error}
                  onClick={() => (replaceTarget ? setReplaceOpen(true) : save())}
                >
                  {t(replaceTarget ? 'Replace quiz' : 'Save to my quizzes')}
                </Button>
              ) : (
                <Button onClick={onSignIn}>{t('Sign in to save')}</Button>
              )}
              <Button
                disabled={!candidate.name.trim() || !!cloud.pending}
                onClick={() => onUse({ ...candidate, name: candidate.name.trim() })}
              >
                {t('Use this quiz')}
              </Button>
            </Space>
          ) : (
            <div className="upload-preview-empty">
              <FileTextOutlined aria-hidden="true" />
              <Paragraph type="secondary">{t('Choose a JSON file to get started.')}</Paragraph>
              <Text type="secondary">
                {t('Review the name and question count before you start.')}
              </Text>
            </div>
          )}
        </Card>
      </div>
      <Modal
        className="cloud-quiz-modal"
        open={replaceOpen && !!candidate && !!replaceTarget}
        title={t('Replace this quiz?')}
        okText={t('Replace quiz')}
        cancelText={t('Cancel')}
        confirmLoading={!!cloud.pending}
        maskClosable={!cloud.pending}
        closable={!cloud.pending}
        cancelButtonProps={{ disabled: !!cloud.pending }}
        onCancel={() => {
          if (!cloud.pending) setReplaceOpen(false);
        }}
        onOk={() => save(true)}
      >
        <Paragraph strong className="cloud-dialog-quiz-name">
          {replaceTarget?.title}
        </Paragraph>
        <Paragraph>
          {t(
            'This replaces the questions and resets this quiz’s saved progress and local drafts. Other quizzes are kept.'
          )}
        </Paragraph>
        {saveError && (
          <Alert
            type="error"
            role="alert"
            showIcon
            message={t(CUSTOM_QUIZ_MESSAGES[saveError.code] || CUSTOM_QUIZ_MESSAGES.CUSTOM_NETWORK)}
          />
        )}
      </Modal>
      <QuestionFormatGuide />
    </div>
  );
}
