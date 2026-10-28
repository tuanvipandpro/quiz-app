import React from 'react';
import { Alert, Button, Card, Collapse, Modal, Spin, Typography } from 'antd';
import { SettingOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import SettingsModal from './SettingsModal';
import { useLanguage } from '../contexts/LanguageContext';
import { formatAnswerLines, formatQuestionText, questionExplanation } from '../utils/questionModel';

const { Title, Paragraph, Text } = Typography;

export default function ExplanationDialogs({ question, state, inline = false }) {
  const { t } = useLanguage();
  const reference = questionExplanation(question);
  const actions = (
    <div className="quiz-dialog-actions">
      <Button
        icon={<SettingOutlined aria-hidden="true" />}
        onClick={() => state.setSettingsVisible(true)}
      >
        {t('AI Settings')}
      </Button>
      <Button
        icon={<ReloadOutlined aria-hidden="true" />}
        disabled={state.loading}
        onClick={() => state.explain({ forceRefresh: true })}
      >
        {t(state.error ? 'Retry' : 'Regenerate')}
      </Button>
      <Button icon={<CloseOutlined aria-hidden="true" />} onClick={state.close}>
        {t('Close')}
      </Button>
    </div>
  );
  const content = question && (
    <div className="markdown-explanation">
      {!inline && (
        <>
          <Title level={5}>{t('Question')}</Title>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{formatQuestionText(question)}</Paragraph>
          <Title level={5}>{t('Correct answer')}</Title>
          {formatAnswerLines(question, question.answer, { showKeys: true }).map((line, index) => (
            <Paragraph key={index}>
              <Text strong>{line}</Text>
            </Paragraph>
          ))}
        </>
      )}
      {reference && (
        <Collapse
          size="small"
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'reference',
              label: t('Included explanation'),
              children: (
                <div className="markdown-container">
                  <Paragraph type="secondary">
                    {t('Provided with this quiz. Compare it with the question and marked answer.')}
                  </Paragraph>
                  <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                    {reference}
                  </ReactMarkdown>
                </div>
              ),
            },
          ]}
        />
      )}
      <Title level={3}>{t('AI explanation')}</Title>
      {state.loading ? (
        <div className="explanation-loading" role="status">
          <Spin />
          <Text>{t('Generating explanation…')}</Text>
        </div>
      ) : state.error ? (
        <Alert
          showIcon
          type="error"
          message={t('Could not generate an explanation. Please retry.')}
          description={t(state.error)}
        />
      ) : (
        <div className="markdown-container">
          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
            {state.explanation}
          </ReactMarkdown>
        </div>
      )}
      <Paragraph type="secondary" className="study-hint">
        {t('Regenerating sends a new AI request using your provider quota.')}
      </Paragraph>
    </div>
  );
  return (
    <>
      {inline ? (
        state.visible && (
          <Card className="explanation-panel" title={t('Question Explanation')}>
            {content}
            {actions}
          </Card>
        )
      ) : (
        <Modal
          title={t('Question Explanation')}
          open={state.visible}
          onCancel={state.close}
          width={700}
          footer={actions}
        >
          {content}
        </Modal>
      )}
      <SettingsModal
        visible={state.settingsVisible}
        onClose={() => state.setSettingsVisible(false)}
      />
    </>
  );
}
