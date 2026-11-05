import React from 'react';
import { Button, Card, Empty, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { quizUpdates } from '../data/quizUpdates';
import { quizzes } from '../data/quizzes';
import { validateQuizUpdates } from '../utils/quizUpdates';
import { quizUrl } from '../utils/navigation';

const { Title, Paragraph, Text } = Typography;
const updates = validateQuizUpdates(quizUpdates, quizzes);

export default function QuizUpdatesPage({ onNavigate }) {
  const { language, t } = useLanguage();
  const dateFormat = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'UTC',
  });
  return (
    <div className="account-page updates-page">
      <Button
        type="text"
        icon={<ArrowLeftOutlined aria-hidden="true" />}
        onClick={() => onNavigate('#/library')}
      >
        {t('Back to library')}
      </Button>
      <div className="page-heading">
        <Title level={1}>{t('Quiz updates')}</Title>
        <Paragraph type="secondary">
          {t(
            'Reviewed additions and changes to the public quiz banks. Dates refer to bank content changes.'
          )}
        </Paragraph>
      </div>
      {!updates.length ? (
        <Empty
          description={t(
            'No reviewed quiz updates yet. Explore the Quiz Bank while new changes are reviewed.'
          )}
        />
      ) : (
        <ol className="quiz-updates-list">
          {updates.map((entry) => {
            const bank = quizzes.find((quiz) => quiz.id === entry.bankId);
            return (
              <li key={entry.id}>
                <Card className="quiz-update">
                  <div className="quiz-update-meta">
                    <Tag>{t(entry.kind === 'added' ? 'Added' : 'Updated')}</Tag>
                    <time dateTime={entry.date}>
                      {dateFormat.format(new Date(`${entry.date}T00:00:00Z`))}
                    </time>
                  </div>
                  <Title level={2}>{bank.name}</Title>
                  <Paragraph>{t(entry.summary)}</Paragraph>
                  <div className="quiz-update-actions">
                    <Button
                      icon={<ArrowRightOutlined aria-hidden="true" />}
                      onClick={() => onNavigate(quizUrl(bank.id))}
                    >
                      {t('Open quiz')}
                    </Button>
                    <Text type="secondary">
                      {t('Reviewed source')}:{' '}
                      <a
                        href={`https://github.com/tuanvipandpro/quiz-app/commit/${entry.sourceRevision}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {entry.sourceRevision.slice(0, 7)}
                      </a>
                    </Text>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
