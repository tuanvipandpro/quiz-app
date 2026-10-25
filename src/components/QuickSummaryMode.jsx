import React, { useEffect, useState } from 'react';
import { Affix, Alert, Button, Card, FloatButton, Space, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, ReadOutlined, ReloadOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import QuizActionButton from './QuizActionButton';
import { loadQuickSummary } from '../services/quickSummary.js';
import { getScrollTarget } from '../utils/scroll';
import './QuickSummaryMode.css';

const { Title, Text, Paragraph } = Typography;

function QuickSummaryMode({ quizId, quizName, questions, onExit, onPracticeQuestion }) {
  const [state, setState] = useState({ loading: true, document: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setState({ loading: true, document: null, error: null });
    loadQuickSummary({ quizId, questions, baseUrl: import.meta.env.BASE_URL, signal: controller.signal })
      .then(document => { if (current) setState({ loading: false, document, error: null }); })
      .catch(error => {
        if (current && error.name !== 'AbortError') setState({ loading: false, document: null, error: error.message });
      });
    return () => { current = false; controller.abort(); };
  }, [quizId, questions, attempt]);

  const guide = state.document;
  const renderContents = () => <ol className="quick-summary-contents">
    {guide.sections.map(section => <li key={section.id}><a href={'#summary-' + section.id}>{section.title}</a></li>)}
  </ol>;

  return <div className="quick-summary">
    <div className="quick-summary-header">
      <div>
        <Text type="secondary" className="quick-summary-quiz-name">{quizName}</Text>
        <Title level={2}><ReadOutlined /> Quick Summary</Title>
        {guide && <Space wrap size={[8, 4]}>
          <Tag>{guide.meta.language === 'vi' ? 'Tiếng Việt' : guide.meta.language}</Tag><Text type="secondary">~{guide.meta.readingMinutes} phút · {guide.sections.length} chủ đề</Text>
          <Text type="secondary">v{guide.meta.version} · {guide.meta.updatedAt}</Text>
        </Space>}
      </div>
      <QuizActionButton label="Back to quiz modes" icon={<ArrowLeftOutlined />} onClick={onExit}>Back</QuizActionButton>
    </div>
    {state.loading && <div className="quick-summary-loading" role="status"><Spin /><Paragraph>Loading Quick Summary...</Paragraph></div>}
    {state.error && <Alert type="error" showIcon message="Quick Summary could not be loaded" description={state.error}
      action={<QuizActionButton label="Retry Quick Summary" icon={<ReloadOutlined />} onClick={() => setAttempt(value => value + 1)}>Retry</QuizActionButton>} />}
    {guide && <>
      <Paragraph type="secondary" className="quick-summary-scope">{guide.meta.description}</Paragraph>
      {guide.sourceChanged && <Alert className="quick-summary-stale" type="warning" showIcon
        message="Bộ câu hỏi đã thay đổi từ khi tài liệu được biên soạn. Hãy đối chiếu lại nội dung và các câu liên quan." />}
      <div className="quick-summary-layout">
        <aside className="quick-summary-sidebar"><Affix offsetTop={88} target={getScrollTarget}><nav aria-label="Quick Summary contents"><Text strong>Mục lục</Text>{renderContents()}</nav></Affix></aside>
        <div className="quick-summary-body">
          <details className="quick-summary-mobile-contents"><summary>Mục lục · {guide.sections.length} chủ đề</summary>
            <nav aria-label="Quick Summary mobile contents">{renderContents()}</nav>
          </details>
          {guide.intro && <div className="quick-summary-intro markdown-container"><ReactMarkdown skipHtml>{guide.intro}</ReactMarkdown></div>}
          {guide.sections.map((section, index) => {
            const related = section.questionIds.map(id => ({ id, index: questions.findIndex(question => String(question.id) === id) })).filter(item => item.index >= 0);
            return <Card key={section.id} className="quick-summary-topic" id={'summary-' + section.id}>
              <Title level={3}>{index + 1}. {section.title}</Title>
              <div className="markdown-container"><ReactMarkdown skipHtml>{section.content}</ReactMarkdown></div>
              {related.length > 0 && <details className="quick-summary-practice">
                <summary>Luyện {related.length} câu liên quan trong Practice</summary>
                <div className="quick-summary-questions">{related.map(item => <Button key={item.id}
                  aria-label={'Practice question ' + (item.index + 1)} onClick={() => onPracticeQuestion(item.id)}>Q{item.index + 1}</Button>)}</div>
              </details>}
            </Card>;
          })}
          <details className="quick-summary-sources"><summary>Nguồn tham khảo</summary><ul>
            {guide.meta.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}
          </ul></details>
        </div>
      </div>
      <FloatButton.BackTop className="quick-summary-back-top" aria-label="Back to top" tooltip="Back to top" target={getScrollTarget} />
    </>}
  </div>;
}

export default QuickSummaryMode;
