import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Space, Typography, Upload } from 'antd';
import { CloudUploadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { validateQuizQuestions } from '../utils/questionModel';
import QuestionFormatGuide from './QuestionFormatGuide';

const { Title, Text, Paragraph } = Typography;

export default function MyQuizzes({ upload, onUse, onOpen, onRemove }) {
  const { t } = useLanguage();
  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState(null);
  const [reading, setReading] = useState(false);
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
    setReading(false);
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Only JSON files are supported.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 1024 * 1024) {
      setError('The file is too large. Please use a file under 1 MiB.');
      return Upload.LIST_IGNORE;
    }
    setReading(true);
    try {
      const questions = JSON.parse(await file.text());
      if (revision !== request.current) return Upload.LIST_IGNORE;
      if (!Array.isArray(questions) || !questions.length || questions.length > 100)
        throw new Error('A quiz must contain 1–100 questions.');
      validateQuizQuestions(questions);
      setCandidate({ id: 'custom', name: file.name.replace(/\.json$/i, ''), questions });
    } catch (failure) {
      if (revision === request.current)
        setError(failure instanceof SyntaxError ? 'Invalid quiz file' : failure.message);
    } finally {
      if (revision === request.current) setReading(false);
    }
    return Upload.LIST_IGNORE;
  };
  return (
    <div className="my-quizzes">
      {holder}
      <div className="page-heading">
        <span className="section-eyebrow">{t('Personal workspace')}</span>
        <Title level={1}>{t('My quizzes')}</Title>
        <Paragraph type="secondary">{t('Practise with your own questions.')}</Paragraph>
      </div>
      <Alert
        showIcon
        type="info"
        className="upload-notice"
        message={t('Only in this tab. Keep your JSON file.')}
      />
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
            disabled={reading}
          >
            <CloudUploadOutlined aria-hidden="true" className="upload-icon" />
            <Title level={3}>
              <span className="desktop-copy">{t('Drop a JSON file here, or choose a file')}</span>
              <span className="mobile-copy">{t('Upload your quiz')}</span>
            </Title>
            <Paragraph>{t('JSON · 1–100 questions · Max 1 MiB')}</Paragraph>
            <Button loading={reading}>{t('Choose JSON file')}</Button>
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
                  maxLength={160}
                  onChange={(event) =>
                    setCandidate((previous) => ({ ...previous, name: event.target.value }))
                  }
                />
              </label>
              <Text>{t('{count} questions', { count: candidate.questions.length })}</Text>
              <Paragraph ellipsis={{ rows: 4 }}>{candidate.questions[0].question}</Paragraph>
              <Button
                type="primary"
                disabled={!candidate.name.trim()}
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
      <QuestionFormatGuide />
    </div>
  );
}
