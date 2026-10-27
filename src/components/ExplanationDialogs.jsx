import React from 'react';
import { Alert, Collapse, Modal, Spin, Typography } from 'antd';
import { SettingOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import SettingsModal from './SettingsModal';
import QuizActionButton from './QuizActionButton';
import { formatAnswerLines, formatQuestionText, questionExplanation } from '../utils/questionModel';

const { Title, Paragraph, Text } = Typography;

export default function ExplanationDialogs({ question, state }) {
  const reference = questionExplanation(question);
  return <>
    <Modal title="Question Explanation" open={state.visible} onCancel={state.close} width={700}
      footer={<div className="quiz-dialog-actions">
        <QuizActionButton label="AI Settings" icon={<SettingOutlined />} onClick={() => state.setSettingsVisible(true)} />
        <QuizActionButton label={state.error ? 'Retry explanation' : 'Regenerate explanation'} icon={<ReloadOutlined />}
          disabled={state.loading} onClick={() => state.explain({ forceRefresh: true })}>{state.error ? 'Retry' : 'Regenerate'}</QuizActionButton>
        <QuizActionButton label="Close explanation" icon={<CloseOutlined />} type="primary" onClick={state.close}>Close</QuizActionButton>
      </div>}>
      {question && <div className="markdown-explanation">
        <Title level={5}>Question:</Title>
        <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{formatQuestionText(question)}</Paragraph>
        <Title level={5}>Marked Answer:</Title>
        {formatAnswerLines(question, question.answer, { showKeys: true }).map((line, index) => <Paragraph key={index}><Text strong>{line}</Text></Paragraph>)}
        {reference && <Collapse size="small" style={{ marginBottom: 16 }} items={[{
          key: 'reference', label: 'Included explanation',
          children: <div className="markdown-container">
            <Paragraph type="secondary">Provided with this quiz. The AI compares it with the question and marked answer.</Paragraph>
            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>{reference}</ReactMarkdown>
          </div>,
        }]} />}
        <Title level={5}>AI explanation:</Title>
        {state.loading ? <div style={{ textAlign: 'center', padding: 30 }}>
          <Spin size="large" /><Paragraph style={{ marginTop: 20 }}>Generating explanation...</Paragraph>
        </div> : state.error ? <Alert showIcon type="error" message={state.error} /> : <div className="markdown-container">
          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>{state.explanation}</ReactMarkdown>
        </div>}
      </div>}
    </Modal>
    <SettingsModal visible={state.settingsVisible} onClose={() => state.setSettingsVisible(false)} />
  </>;
}
