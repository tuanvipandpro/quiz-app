import React from 'react';
import { Alert, Button, Modal, Spin, Typography } from 'antd';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import SettingsModal from './SettingsModal';

const { Title, Paragraph, Text } = Typography;

export default function ExplanationDialogs({ question, state }) {
  return <>
    <Modal title="Question Explanation" open={state.visible} onCancel={state.close} width={700}
      footer={[
        <Button key="settings" onClick={() => state.setSettingsVisible(true)}>AI Settings</Button>,
        <Button key="retry" disabled={state.loading} onClick={() => state.explain({ forceRefresh: true })}>{state.error ? 'Retry' : 'Regenerate'}</Button>,
        <Button key="close" type="primary" onClick={state.close}>Close</Button>
      ]}>
      {state.loading ? <div style={{ textAlign: 'center', padding: 30 }}>
        <Spin size="large" /><Paragraph style={{ marginTop: 20 }}>Generating explanation...</Paragraph>
      </div> : state.error ? <Alert showIcon type="error" message={state.error} /> : question && <div className="markdown-explanation">
        <Title level={5}>Question:</Title>
        <Paragraph>{question.question}</Paragraph>
        <Title level={5}>Marked Answer:</Title>
        {[...question.answer].sort().map(key => <Paragraph key={key}><Text strong>{key}. {question.options[key]}</Text></Paragraph>)}
        <Title level={5}>Explanation:</Title>
        <div className="markdown-container">
          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>{state.explanation}</ReactMarkdown>
        </div>
      </div>}
    </Modal>
    <SettingsModal visible={state.settingsVisible} onClose={() => state.setSettingsVisible(false)} />
  </>;
}
