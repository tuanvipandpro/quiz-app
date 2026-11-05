import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Empty, Modal, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useExamHistory } from '../hooks/useExamHistory';
import { EXAM_HISTORY_ENABLED } from '../config/examHistoryConfig';
import { EXAM_HISTORY_LIMIT, EXAM_HISTORY_PAGE_SIZE } from '../data/examHistoryLimits.js';
import { getExamFeedbackMode } from '../data/examModes.js';
import { retainedHistoryStats } from '../utils/examHistory.js';
import { HISTORY_MESSAGES } from '../utils/examHistoryErrors.js';
import ArchivedExamReview from './ArchivedExamReview';

const { Title, Paragraph, Text } = Typography;
export default function ExamHistoryPage({
  user,
  authLoading,
  attemptId,
  pageNumber = 1,
  onNavigate,
  onSignIn,
  initialScroll = 0,
}) {
  const { language, t } = useLanguage(),
    uid = authLoading ? null : user?.uid;
  const history = useExamHistory(uid, attemptId);
  const [deletion, setDeletion] = useState(null),
    [deleteError, setDeleteError] = useState(null),
    [deletedNotice, setDeletedNotice] = useState(false);
  const heading = useRef(null),
    deleteTrigger = useRef(null),
    deleted = useRef(false);
  const dateLabel = (value) =>
    new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  const pages = Math.max(1, Math.ceil(history.summaries.length / EXAM_HISTORY_PAGE_SIZE)),
    page = Math.max(1, Math.min(pageNumber, pages));
  const pageUrl = (value) => `#/history${value > 1 ? '?page=' + value : ''}`;
  useEffect(() => {
    if (!attemptId && !history.loading && history.summaries.length && initialScroll) {
      const frame = requestAnimationFrame(() => {
        window.scrollTo({ top: initialScroll });
        document.body.scrollTo({ top: initialScroll });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [attemptId, history.loading, history.summaries, initialScroll]);
  const requestDelete = (summary, trigger) => {
    deleteTrigger.current = trigger || document.activeElement;
    deleted.current = false;
    setDeletedNotice(false);
    setDeleteError(null);
    setDeletion(summary);
  };
  const confirmDelete = async () => {
    try {
      setDeleteError(null);
      await history.remove(deletion.attemptId);
      deleted.current = true;
      setDeletedNotice(true);
      setDeletion(null);
      if (attemptId) onNavigate(pageUrl(pageNumber));
    } catch (error) {
      setDeleteError(error);
    }
  };
  let content;
  if (!EXAM_HISTORY_ENABLED)
    content = (
      <Alert
        type="info"
        showIcon
        message={t('Exam history is not available yet. Results remain in this tab.')}
      />
    );
  else if (authLoading)
    content = (
      <div role="status" className="inline-status">
        <Spin />
        {t('Loading exam history…')}
      </div>
    );
  else if (!uid)
    content = (
      <Card>
        <Title level={2}>{t('Sign in to view exam history')}</Title>
        <Paragraph>{t('Your saved exam results are private to your account.')}</Paragraph>
        <Button type="primary" onClick={onSignIn}>
          {t('Sign in')}
        </Button>
      </Card>
    );
  else if (attemptId)
    content = history.recordLoading ? (
      <div role="status" className="inline-status">
        <Spin />
        {t('Loading saved result…')}
      </div>
    ) : history.recordError ? (
      <Alert
        role="alert"
        showIcon
        type="error"
        message={t(
          HISTORY_MESSAGES[history.recordError.code] || HISTORY_MESSAGES.HISTORY_UNAVAILABLE
        )}
        action={<Button onClick={history.reload}>{t('Retry')}</Button>}
      />
    ) : (
      history.record && (
        <ArchivedExamReview
          key={history.record.summary.attemptId}
          record={history.record}
          sourceStatus={history.sourceStatus}
          onNavigate={onNavigate}
          onDelete={requestDelete}
          dateLabel={dateLabel}
        />
      )
    );
  else if (history.loading)
    content = (
      <div role="status" className="inline-status">
        <Spin />
        {t('Loading exam history…')}
      </div>
    );
  else if (history.error)
    content = (
      <Alert
        role="alert"
        showIcon
        type="error"
        message={t(HISTORY_MESSAGES[history.error.code] || HISTORY_MESSAGES.HISTORY_UNAVAILABLE)}
        action={<Button onClick={history.reload}>{t('Retry')}</Button>}
      />
    );
  else
    content = (
      <>
        <div className="history-retention">
          <Tag>
            {t('{count}/{limit} saved exams', {
              count: history.summaries.length,
              limit: EXAM_HISTORY_LIMIT,
            })}
          </Tag>
          <Text type="secondary">
            {t('Statistics cover all retained attempts. Delete an archive to free space.')}
          </Text>
        </div>
        {history.summaries.length === EXAM_HISTORY_LIMIT && (
          <Alert
            className="history-full"
            type="info"
            showIcon
            message={t('Your history is full. Delete an older attempt, then retry this result.')}
          />
        )}
        {!history.summaries.length ? (
          <Empty
            description={t(
              'No saved exam results yet. Complete a future exam on a bank or a saved quiz to build your history.'
            )}
          />
        ) : (
          <>
            <section className="history-statistics" aria-label={t('Retained history statistics')}>
              {retainedHistoryStats(history.summaries).map((group) => (
                <Card key={group.key}>
                  <Title level={2}>{group.title}</Title>
                  <div className="history-stat-values">
                    <span>
                      {t('Attempts')}: <strong>{group.count}</strong>
                    </span>
                    <span>
                      {t('Best')}: <strong>{group.best.toFixed(1)}%</strong>
                    </span>
                    <span>
                      {t('Latest')}:{' '}
                      <strong>
                        {((group.last.correct / group.last.questionCount) * 100).toFixed(1)}%
                      </strong>
                    </span>
                  </div>
                </Card>
              ))}
            </section>
            <section className="history-attempts" aria-label={t('Saved exams')}>
              <Title level={2}>{t('Saved exams')}</Title>
              <ol>
                {history.summaries
                  .slice((page - 1) * EXAM_HISTORY_PAGE_SIZE, page * EXAM_HISTORY_PAGE_SIZE)
                  .map((summary) => (
                    <li key={summary.attemptId}>
                      <Card className="history-attempt" id={'history-attempt-' + summary.attemptId}>
                        <div className="history-attempt-heading">
                          <div>
                            <Title level={3}>{summary.source.title}</Title>
                            <time dateTime={new Date(summary.endedAt).toISOString()}>
                              {dateLabel(summary.endedAt)}
                            </time>
                          </div>
                          <Tag color={summary.passed ? 'success' : 'default'}>
                            {summary.correct}/{summary.questionCount} ·{' '}
                            {t(summary.passed ? 'Pass' : 'Not passed')}
                          </Tag>
                        </div>
                        <Paragraph type="secondary">
                          {t(getExamFeedbackMode(summary.feedbackMode).label)} ·{' '}
                          {t(summary.endReason === 'expired' ? 'Expired' : 'Submitted')}
                        </Paragraph>
                        <div className="history-attempt-actions">
                          <Button
                            type="primary"
                            onClick={() =>
                              onNavigate(`#/history/${summary.attemptId}?page=${page}`)
                            }
                          >
                            {t('Review saved result')}
                          </Button>
                          <Button
                            danger
                            disabled={!!history.pending}
                            onClick={(event) => requestDelete(summary, event.currentTarget)}
                          >
                            {t('Delete archive')}
                          </Button>
                        </div>
                      </Card>
                    </li>
                  ))}
              </ol>
            </section>
            <div className="history-pagination" role="group" aria-label={t('History pages')}>
              <Button
                icon={<ArrowLeftOutlined aria-hidden="true" />}
                disabled={page === 1}
                onClick={() => onNavigate(pageUrl(page - 1))}
              >
                {t('Previous page')}
              </Button>
              <Text>{t('Page {page} of {total}', { page, total: pages })}</Text>
              <Button
                icon={<ArrowRightOutlined aria-hidden="true" />}
                disabled={page === pages}
                onClick={() => onNavigate(pageUrl(page + 1))}
              >
                {t('Next page')}
              </Button>
            </div>
          </>
        )}
        <Paragraph className="history-receipt-note" type="secondary">
          {t(
            'Deleting an archive removes its questions and answers. A private deletion receipt remains to prevent stale retries from recreating it.'
          )}
        </Paragraph>
      </>
    );
  return (
    <div className="exam-history-page">
      <Button
        type="text"
        icon={<ArrowLeftOutlined aria-hidden="true" />}
        onClick={() => onNavigate(attemptId ? pageUrl(pageNumber) : '#/library')}
      >
        {t(attemptId ? 'Back to history' : 'Back to library')}
      </Button>
      <div className="history-page-heading">
        <div>
          <Title level={1} tabIndex={-1} ref={heading}>
            {t('Exam history')}
          </Title>
          <Paragraph type="secondary">
            {t('Personal learning history, not an official exam credential.')}
          </Paragraph>
        </div>
        {uid && EXAM_HISTORY_ENABLED && (
          <Button
            icon={<ReloadOutlined aria-hidden="true" />}
            disabled={history.loading || history.recordLoading || !!history.pending}
            onClick={() => {
              setDeletedNotice(false);
              history.reload();
            }}
          >
            {t('Refresh history')}
          </Button>
        )}
      </div>
      {deletedNotice && (
        <Alert
          role="status"
          type="success"
          showIcon
          className="history-delete-success"
          message={t('Archive deleted.')}
        />
      )}
      {content}
      <Modal
        className="app-danger-dialog"
        open={!!deletion}
        title={t('Delete this exam archive?')}
        onOk={confirmDelete}
        onCancel={() => {
          if (!history.pending) setDeletion(null);
        }}
        confirmLoading={!!history.pending}
        okButtonProps={{ danger: true }}
        cancelButtonProps={{ disabled: !!history.pending }}
        maskClosable={!history.pending}
        closable={!history.pending}
        keyboard={!history.pending}
        okText={t('Delete archive')}
        cancelText={t('Cancel')}
        afterClose={() => {
          if (deleted.current) {
            heading.current?.focus({ preventScroll: true });
            heading.current?.scrollIntoView({ block: 'nearest' });
          } else
            deleteTrigger.current?.isConnected &&
              deleteTrigger.current.focus({ preventScroll: true });
        }}
      >
        <Paragraph strong>{deletion?.source.title}</Paragraph>
        <Paragraph>{deletion && dateLabel(deletion.endedAt)}</Paragraph>
        <Paragraph>
          {t(
            'Questions and answers will be removed from history. The original quiz is kept. A minimal deletion receipt remains.'
          )}
        </Paragraph>
        {deleteError && (
          <Alert
            role="alert"
            showIcon
            type="error"
            message={t(HISTORY_MESSAGES[deleteError.code] || HISTORY_MESSAGES.HISTORY_UNAVAILABLE)}
          />
        )}
      </Modal>
    </div>
  );
}
