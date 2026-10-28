import React, { useState } from 'react';
import { Button, Radio, Typography, message } from 'antd';
import { CheckOutlined, CodeOutlined, CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { questionFormats } from '../data/questionFormats';
import './QuestionFormatGuide.css';

const { Title, Text, Paragraph } = Typography;

export default function QuestionFormatGuide() {
  const { t } = useLanguage();
  const [formatId, setFormatId] = useState('single');
  const [messageApi, holder] = message.useMessage();
  const format = questionFormats.find((item) => item.id === formatId);
  const example = JSON.stringify(format.questions, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(example);
      messageApi.success(t('Example JSON copied.'));
    } catch {
      messageApi.error(t('Copy is unavailable. Download the example instead.'));
    }
  };
  return (
    <section
      className="format-guide"
      id="question-format-guide"
      tabIndex={-1}
      aria-labelledby="format-guide-heading"
    >
      {holder}
      <div className="format-guide-heading">
        <div>
          <span className="section-eyebrow">
            <CodeOutlined aria-hidden="true" /> JSON
          </span>
          <Title level={2} id="format-guide-heading">
            {t('Question format guide')}
          </Title>
          <Paragraph type="secondary">
            {t('Choose a format, then copy or download a complete quiz example.')}
          </Paragraph>
        </div>
      </div>
      <div className="format-guide-layout">
        <div className="format-examples">
          <Radio.Group
            className="format-selector"
            role="radiogroup"
            aria-label={t('Question type')}
            value={formatId}
            onChange={(event) => setFormatId(event.target.value)}
          >
            {questionFormats.map((item) => (
              <Radio.Button value={item.id} key={item.id}>
                {t(item.label)}
              </Radio.Button>
            ))}
          </Radio.Group>
          <div className="format-example-heading">
            <Paragraph>{t(format.description)}</Paragraph>
            <div className="format-example-actions">
              <Button icon={<CopyOutlined aria-hidden="true" />} onClick={copy}>
                {t('Copy JSON')}
              </Button>
              <Button
                icon={<DownloadOutlined aria-hidden="true" />}
                href={import.meta.env.BASE_URL + `examples/quiz-${formatId}.json`}
                download={`quiz-${formatId}.json`}
              >
                {t('Download example')}
              </Button>
            </div>
          </div>
          <pre className="format-code" aria-label={t('Complete JSON example')}>
            <code>{example}</code>
          </pre>
        </div>
        <aside className="format-reference" aria-label={t('File requirements')}>
          <Title level={3}>{t('Before you upload')}</Title>
          <ul className="format-checklist">
            {[
              'The file must be a JSON array of questions.',
              'Include 1–100 questions with unique IDs.',
              'Every answer must reference an existing option.',
              'Keep the file under 1 MiB.',
            ].map((rule) => (
              <li key={rule}>
                <CheckOutlined aria-hidden="true" />
                <span>{t(rule)}</span>
              </li>
            ))}
          </ul>
          <Title level={3}>{t('Required fields')}</Title>
          <dl className="format-fields">
            {[
              ['id', 'A unique string or number for each question.'],
              ['question', 'The question text.'],
              ['options', 'Choice keys mapped to their text. Dropdowns use one map per slot.'],
              ['answer', 'An array of option keys, or a mapping for yes/no and dropdown parts.'],
            ].map(([field, description]) => (
              <div key={field}>
                <dt>
                  <code>{field}</code>
                </dt>
                <dd>{t(description)}</dd>
              </div>
            ))}
          </dl>
          <Text type="secondary" className="format-optional">
            {t('Optional fields')}: <code>imageUrl</code>, <code>explanation</code>,{' '}
            <code>instruction</code>.
          </Text>
        </aside>
      </div>
    </section>
  );
}
