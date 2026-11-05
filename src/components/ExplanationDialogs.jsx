import React, { useEffect, useRef } from 'react';
import { Alert, Button, Card, Collapse, Modal, Spin, Typography } from 'antd';
import { SettingOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import SettingsModal from './SettingsModal';
import { EXPLANATION_LANGUAGE } from '../services/llm/explanationPrompt';
import { AiUsage } from './AiSourceControl';
import { useLanguage } from '../contexts/LanguageContext';
import { formatAnswerLines, formatQuestionText, questionExplanation } from '../utils/questionModel';

const { Title, Paragraph, Text } = Typography;

export default function ExplanationDialogs({ question, state, inline = false }) {
  const { t } = useLanguage();
  const panelRef = useRef(null);
  const settingsTrigger = useRef(null);
  useEffect(() => {
    if (inline && state.visible) {
      panelRef.current?.focus({ preventScroll: true });
      panelRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [inline, state.visible, state.revealRequest]);
  const reference = questionExplanation(question);
  const actions = (
    <div className="quiz-dialog-actions">
      <Button
        type="primary"
        icon={<ReloadOutlined aria-hidden="true" />}
        loading={state.loading}
        onClick={(event) => {
          settingsTrigger.current = event.currentTarget;
          state.explain({ forceRefresh: state.requested && !state.error });
        }}
      >
        {t(state.requested ? (state.error ? 'Retry' : 'Regenerate') : 'Generate AI explanation')}
      </Button>
      <Button
        icon={<SettingOutlined aria-hidden="true" />}
        onClick={(event) => {
          settingsTrigger.current = event.currentTarget;
          state.setSettingsVisible(true);
        }}
      >
        {t('AI Settings')}
      </Button>
      {state.error && state.source === 'app' && (
        <Button
          disabled={state.loading || state.usage?.remaining === 0}
          onClick={() => state.explain({ forceRefresh: true })}
        >
          {t('Regenerate')}
        </Button>
      )}
      <Button
        icon={<CloseOutlined aria-hidden="true" />}
        onClick={() => {
          state.close();
          state.triggerRef.current?.focus({ preventScroll: true });
        }}
      >
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
      {reference ? (
        <Collapse
          className="included-explanation"
          size="small"
          defaultActiveKey={['reference']}
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
      ) : (
        <Alert
          className="missing-explanation"
          type="info"
          showIcon
          message={t('No explanation is included with this question.')}
        />
      )}
      <Title level={3}>{t('AI explanation')}</Title>
      <Text type="secondary">{t(state.source === 'app' ? 'App AI' : 'Your API key')}</Text>
      {!state.requested && (
        <Paragraph type="secondary">
          {t('Generate AI help when you need more explanation.')}
        </Paragraph>
      )}
      {state.requested && (
        <div className="ai-generated-explanation">
          {state.source === 'app' && <AiUsage usage={state.usage} />}
          {state.loading ? (
            <div className="explanation-loading" role="status">
              <Spin />
              <Text>{t('Generating explanation…')}</Text>
            </div>
          ) : state.error ? (
            <Alert
              showIcon
              role="alert"
              type="error"
              message={t('Could not generate an explanation. Please retry.')}
              description={t(state.error)}
            />
          ) : (
            <div className="markdown-container" lang={EXPLANATION_LANGUAGE}>
              <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                {state.explanation}
              </ReactMarkdown>
            </div>
          )}
          <Paragraph type="secondary" className="study-hint">
            {t(
              state.source === 'app'
                ? 'Regenerating uses a new App AI attempt.'
                : 'Regenerating sends a new AI request using your provider quota.'
            )}
          </Paragraph>
        </div>
      )}
    </div>
  );
  return (
    <>
      {inline ? (
        state.visible && (
          <Card
            ref={panelRef}
            tabIndex={-1}
            role="region"
            aria-label={t('Question Explanation')}
            className="explanation-panel"
            title={t('Question Explanation')}
          >
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
        afterClose={() => {
          if (settingsTrigger.current?.isConnected)
            settingsTrigger.current.focus({ preventScroll: true });
          else state.triggerRef.current?.focus();
        }}
      />
    </>
  );
}
