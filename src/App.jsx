import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  ConfigProvider,
  Layout,
  Modal,
  Space,
  Spin,
  Typography,
  message,
  theme as antdTheme,
} from 'antd';
import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import { ArrowLeftOutlined, GithubOutlined } from '@ant-design/icons';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { useHashRoute } from './hooks/useHashRoute';
import { useQuizProgress } from './hooks/useQuizProgress';
import QuizLibrary from './components/QuizLibrary';
import MyQuizzes from './components/MyQuizzes';
import QuizMode from './components/QuizMode';
import SignInModal from './components/SignInModal';
import AppHeader from './components/AppHeader';
import ProviderIdentity from './components/ProviderIdentity';
import { findQuiz } from './data/quizzes';
import { getQuickSummary } from './data/quickSummaries';
import { resolveCheckpoint } from './utils/quizProgress';
import { validateQuizQuestions } from './utils/questionModel';
import { clearStudySessions, readStudySession, sessionKey } from './utils/studySession';
import { canonicalQuizHash, quizUrl, resolveLoadedQuiz } from './utils/navigation';
import 'antd/dist/reset.css';
import './App.css';
import './markdown.css';

const { Content, Footer } = Layout;
const { Title, Text } = Typography;
const UPLOAD_KEY = 'quiz-tab-upload-v1';
const PracticeMode = lazy(() => import('./components/PracticeMode'));
const ExamMode = lazy(() => import('./components/ExamMode'));
const QuickSummaryMode = lazy(() => import('./components/QuickSummaryMode'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

function initialDarkMode() {
  try {
    const saved = localStorage.getItem('quiz-app-theme');
    if (saved) return saved === 'dark';
  } catch {
    /* Use system appearance. */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export default function App() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { language, t } = useLanguage();
  const uid = user?.uid || null;
  const progressState = useQuizProgress(uid);
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
  const [modal, modalHolder] = Modal.useModal();
  const [messageApi, messageHolder] = message.useMessage();
  const [examActive, setExamActive] = useState(false);
  const guardPending = useRef(false);
  const guard = useCallback(
    (proceed, cancelled) => {
      if (!examActive) return false;
      if (guardPending.current) return true;
      guardPending.current = true;
      modal.confirm({
        title: t('Leave this exam?'),
        content: t('Your draft will remain in this tab. The timer keeps running.'),
        okText: t('Leave exam'),
        cancelText: t('Continue exam'),
        onOk: () => {
          guardPending.current = false;
          proceed();
        },
        onCancel: () => {
          guardPending.current = false;
          cancelled?.();
        },
      });
      return true;
    },
    [examActive, modal, t]
  );
  const { hash, route, navigate, replace } = useHashRoute(guard, {
    active: examActive,
    message:
      t('Leave this exam?') +
      '\n' +
      t('Your draft will remain in this tab. The timer keeps running.'),
  });
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loadRevision, setLoadRevision] = useState(0);
  const [upload, setUpload] = useState(null);
  const [uploadReady, setUploadReady] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const cache = useRef(new Map());
  const scrollPositions = useRef(new Map());
  const previousUid = useRef(uid);
  const header = useRef(null);

  useEffect(() => {
    const canonical = canonicalQuizHash(hash);
    if (canonical !== hash) replace(canonical);
  }, [hash]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (header.current)
        document.documentElement.style.setProperty(
          '--app-header-height',
          `${header.current.getBoundingClientRect().height}px`
        );
    });
    if (header.current) observer.observe(header.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
    try {
      localStorage.setItem('quiz-app-theme', isDarkMode ? 'dark' : 'light');
    } catch {
      /* Keep the active theme. */
    }
  }, [isDarkMode]);

  useEffect(() => {
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    if (examActive) window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [examActive]);

  useEffect(() => {
    if (authLoading) return;
    if (previousUid.current !== uid) {
      setLoaded((previous) => (previous?.id === 'custom' ? null : previous));
      try {
        clearStudySessions(sessionStorage, previousUid.current);
      } catch {
        /* Optional local drafts. */
      }
      if (route.quizId === 'custom') navigate('#/library', true);
      previousUid.current = uid;
    }
    let next = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(UPLOAD_KEY));
      if (
        saved &&
        saved.owner === uid &&
        saved.id === 'custom' &&
        typeof saved.name === 'string' &&
        saved.name.trim()
      ) {
        validateQuizQuestions(saved.questions);
        if (saved.questions.length <= 100) next = saved;
      }
      if (!next) sessionStorage.removeItem(UPLOAD_KEY);
    } catch {
      /* A malformed or inaccessible upload is ignored. */
    }
    setUpload(next);
    setUploadReady(true);
  }, [uid, authLoading]);

  useEffect(() => {
    if (route.page !== 'quiz') {
      setLoading(false);
      return;
    }
    const id = route.quizId;
    if (id === 'custom' && !uploadReady) return;
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setLoadError(null);
    const load = async () => {
      try {
        if (id === 'custom') {
          if (!upload) throw new Error('This quiz is no longer available.');
          if (current) setLoaded(upload);
          return;
        }
        const quiz = findQuiz(id);
        if (!quiz) throw new Error('This quiz is no longer available.');
        let questions = cache.current.get(id);
        if (!questions) {
          const response = await fetch(import.meta.env.BASE_URL + quiz.file, {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error('Could not load this quiz.');
          questions = await response.json();
          validateQuizQuestions(questions, { allowLegacyIncomplete: true });
          cache.current.set(id, questions);
        }
        if (current) setLoaded({ ...quiz, questions });
      } catch (error) {
        if (current && error.name !== 'AbortError') setLoadError(error.message);
      } finally {
        if (current) setLoading(false);
      }
    };
    load();
    return () => {
      current = false;
      controller.abort();
    };
  }, [route.page, route.quizId, upload, uploadReady, loadRevision]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const top = scrollPositions.current.get(hash) || 0;
      window.scrollTo({ top, behavior: 'auto' });
      document.body.scrollTo({ top, behavior: 'auto' });
      document.getElementById('main-content')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  const go = (next, bypass = false) => {
    scrollPositions.current.set(hash, Math.max(window.scrollY, document.body.scrollTop));
    navigate(next, bypass);
  };
  const openQuiz = (quiz, mode, resume = false, setupMode = null) => {
    const params = resume
      ? { resume: '1', entry: String(Date.now()) }
      : setupMode
        ? { mode: setupMode }
        : {};
    go(quizUrl(quiz.id, mode, params));
  };
  const active = resolveLoadedQuiz(loaded, route.quizId, uid);
  const guide = getQuickSummary(route.quizId);
  useEffect(() => {
    document.title =
      (route.page === 'library'
        ? t('Quiz Bank')
        : route.page === 'my-quizzes'
          ? t('My quizzes')
          : active?.name || t('Quiz overview')) + ' · Quiz App';
  }, [route.page, active?.name, t]);
  let examDraft = null;
  if (active && route.mode === 'overview') {
    try {
      examDraft = readStudySession(
        sessionStorage,
        sessionKey(uid, active.id, 'exam'),
        active.questions,
        'exam'
      );
    } catch {
      /* No local draft. */
    }
  }
  const hasExamDraft = !!examDraft && !examDraft.submitted;
  const selectMode = (mode, time, count, fresh = false) => {
    const start = () =>
      go(
        quizUrl(
          active.id,
          mode,
          mode === 'exam'
            ? {
                time: String(time),
                count: String(count),
                ...(fresh || !hasExamDraft ? { fresh: String(Date.now()) } : {}),
              }
            : {}
        )
      );
    if (mode === 'exam' && fresh && hasExamDraft)
      modal.confirm({
        title: t('Start a new exam?'),
        content: t('This replaces the draft in this tab.'),
        okText: t('Start mock exam'),
        cancelText: t('Cancel'),
        onOk: start,
      });
    else start();
  };
  const useUpload = (next) => {
    const value = { ...next, owner: uid };
    try {
      sessionStorage.setItem(UPLOAD_KEY, JSON.stringify(value));
      for (const mode of ['practice', 'exam'])
        sessionStorage.removeItem(sessionKey(uid, 'custom', mode));
    } catch {
      /* The current upload still works without browser storage. */
    }
    setUpload(value);
    go(quizUrl('custom'));
  };
  const removeUpload = () => {
    try {
      sessionStorage.removeItem(UPLOAD_KEY);
      for (const mode of ['practice', 'exam'])
        sessionStorage.removeItem(sessionKey(uid, 'custom', mode));
    } catch {
      /* Remove the in-memory upload too. */
    }
    setUpload(null);
  };
  const openLogin = () => {
    setLoginError(null);
    setLoginVisible(true);
  };
  const login = async () => {
    if (loginBusy) return;
    setLoginBusy(true);
    setLoginError(null);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        setLoginVisible(false);
        messageApi.success(
          t('Welcome, {name}!', { name: result.user.displayName || result.user.email })
        );
      } else setLoginError('Could not sign in. Please retry.');
    } catch {
      setLoginError('Could not sign in. Please retry.');
    } finally {
      setLoginBusy(false);
    }
  };
  const logout = () => {
    modal.confirm({
      title: t('Sign out?'),
      content: t(
        examActive
          ? 'Signing out will end this exam and clear its local draft. Saved checkpoints stay in your account.'
          : 'Local study drafts will be cleared. Saved checkpoints stay in your account.'
      ),
      okText: t('Sign out'),
      cancelText: t('Cancel'),
      okButtonProps: { danger: true },
      autoFocusButton: 'cancel',
      onOk: async () => {
        try {
          const result = await signOut();
          if (!result.success) throw new Error('Sign out failed');
          setExamActive(false);
          go('#/library', true);
          messageApi.success(t('Signed out successfully'));
        } catch (error) {
          messageApi.error(t('Could not sign out. Please retry.'));
          throw error;
        }
      },
    });
  };

  let screen;
  if (route.page === 'library')
    screen = (
      <QuizLibrary
        query={query}
        onQueryChange={setQuery}
        expanded={expanded}
        onExpandedChange={setExpanded}
        progressState={progressState}
        onOpen={openQuiz}
      />
    );
  else if (route.page === 'my-quizzes')
    screen = (
      <MyQuizzes
        key={uid || 'guest'}
        upload={upload?.owner === uid ? upload : null}
        onUse={useUpload}
        onOpen={(mode) => go(quizUrl('custom', mode, mode === 'overview' ? { mode: 'exam' } : {}))}
        onRemove={removeUpload}
      />
    );
  else if (loadError)
    screen = (
      <div className="load-state">
        <Alert
          type="error"
          showIcon
          message={t(loadError)}
          description={t('Please retry or return to the library.')}
        />
        <Space wrap>
          <Button onClick={() => setLoadRevision((value) => value + 1)}>{t('Retry')}</Button>
          <Button onClick={() => go('#/library')}>{t('Back to library')}</Button>
        </Space>
      </div>
    );
  else if (
    loading ||
    !active ||
    authLoading ||
    (route.params.get('resume') === '1' && progressState.loading)
  )
    screen = (
      <div className="load-state" role="status">
        <Spin size="large" />
        <Text>{t('Loading quiz…')}</Text>
      </div>
    );
  else if (route.mode === 'practice') {
    const questionId = route.params.get('question');
    const relatedIndex =
      questionId === null
        ? null
        : active.questions.findIndex((question) => String(question.id) === questionId);
    const checkpoint =
      route.params.get('resume') === '1'
        ? resolveCheckpoint(active.questions, progressState.progress[active.id])
        : null;
    screen = (
      <PracticeMode
        key={`${active.id}:${uid || 'guest'}:${route.params.get('fresh') || ''}:${questionId || ''}:${route.params.get('entry') || ''}`}
        questions={active.questions}
        quizId={active.id === 'custom' ? null : active.id}
        sessionId={active.id}
        quizName={active.name}
        progressState={progressState}
        initialQuestionIndex={
          relatedIndex >= 0 && relatedIndex !== null ? relatedIndex : (checkpoint?.index ?? null)
        }
        adjustedCheckpoint={checkpoint?.adjusted}
        fresh={route.params.get('fresh')}
        entryToken={hash}
        onSignIn={openLogin}
        onExit={() => go(quizUrl(active.id))}
        onBackToSummary={
          route.params.get('from') === 'summary' ? () => go(quizUrl(active.id, 'summary')) : null
        }
      />
    );
  } else if (route.mode === 'exam')
    screen = (
      <ExamMode
        key={`${active.id}:${uid || 'guest'}:${route.params.get('fresh') || ''}`}
        questions={active.questions}
        quizId={active.id}
        quizName={active.name}
        examTimeMinutes={Number(route.params.get('time')) === 120 ? 120 : 60}
        examQuestionCount={
          [50, 60, 70, 80].includes(Number(route.params.get('count')))
            ? Number(route.params.get('count'))
            : Math.min(50, active.questions.length)
        }
        fresh={route.params.get('fresh')}
        onRunningChange={setExamActive}
        onExit={() => go(quizUrl(active.id, 'overview', { mode: 'exam' }))}
        onRestart={() => go(quizUrl(active.id, 'overview', { mode: 'exam' }))}
      />
    );
  else if (route.mode === 'summary' && guide)
    screen = (
      <QuickSummaryMode
        key={active.id}
        quizId={active.id}
        quizName={active.name}
        questions={active.questions}
        initialScroll={scrollPositions.current.get(hash) || 0}
        onExit={() => go(quizUrl(active.id))}
        onPracticeQuestion={(id) =>
          go(
            quizUrl(active.id, 'practice', {
              question: String(id),
              from: 'summary',
              entry: String(Date.now()),
            })
          )
        }
      />
    );
  else
    screen = (
      <div className="quiz-setup">
        <div className="quiz-overview-header">
          <div className="quiz-overview-identity">
            <Button
              type="text"
              icon={<ArrowLeftOutlined aria-hidden="true" />}
              onClick={() => go(active.id === 'custom' ? '#/my-quizzes' : '#/library')}
            >
              {t('Back to library')}
            </Button>
            <div className="quiz-provider-label">
              {active.category ? (
                <ProviderIdentity provider={active.category} />
              ) : (
                t('Your uploaded quiz')
              )}
            </div>
            <Title level={1}>{active.name}</Title>
            <Text type="secondary">
              {t('{count} questions', { count: active.questions.length })}
            </Text>
          </div>
        </div>
        <QuizMode
          key={active.id}
          onSelectMode={selectMode}
          onModeChange={(mode) => replace(quizUrl(active.id, 'overview', { mode }))}
          totalQuestions={active.questions.length}
          quickSummary={guide}
          initialMode={
            ['exam', 'summary'].includes(route.params.get('mode'))
              ? route.params.get('mode')
              : 'practice'
          }
          hasExamDraft={hasExamDraft}
          examDraftCount={examDraft?.questions.length}
        />
        {progressState.progress[active.id] && (
          <Button
            className="overview-resume"
            onClick={() =>
              go(quizUrl(active.id, 'practice', { resume: '1', entry: String(Date.now()) }))
            }
          >
            {Number.isInteger(progressState.progress[active.id].questionIndex)
              ? t('Saved at question {number}', {
                  number: progressState.progress[active.id].questionIndex + 1,
                })
              : t('Saved position')}{' '}
            · {t('Resume')}
          </Button>
        )}
      </div>
    );

  const studying = route.page === 'quiz' && ['practice', 'exam', 'summary'].includes(route.mode);
  return (
    <ConfigProvider
      locale={language === 'vi' ? viVN : enUS}
      theme={{
        algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: isDarkMode ? '#91bfff' : '#245db4',
          colorLink: isDarkMode ? '#a8ceff' : '#245db4',
          colorBgContainer: isDarkMode ? '#1c2736' : '#ffffff',
          colorBgElevated: isDarkMode ? '#1c2736' : '#ffffff',
          colorText: isDarkMode ? '#ecf2fa' : '#192e49',
          colorTextSecondary: isDarkMode ? '#b0bed1' : '#586b82',
          colorTextDescription: isDarkMode ? '#b0bed1' : '#586b82',
          colorTextPlaceholder: isDarkMode ? '#b0bed1' : '#586b82',
          colorBorder: isDarkMode ? '#38485c' : '#dce4ee',
          borderRadius: 10,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
          controlHeight: 40,
          fontSize: 15,
          fontSizeLG: 16,
        },
      }}
    >
      {modalHolder}
      {messageHolder}
      <Layout className={`layout${studying ? ' is-studying' : ''}`}>
        <a
          href="#main-content"
          className="skip-link"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
        >
          {language === 'vi' ? 'Đến nội dung chính' : 'Skip to content'}
        </a>
        <AppHeader
          headerRef={header}
          page={route.page}
          onNavigate={go}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode((value) => !value)}
          authLoading={authLoading}
          user={user}
          onSettings={() => setSettingsVisible(true)}
          onSignOut={logout}
          onSignIn={openLogin}
        />
        <Content id="main-content" tabIndex={-1}>
          <Suspense
            fallback={
              <div className="load-state" role="status">
                <Spin />
                <Text>{t('Loading quiz…')}</Text>
              </div>
            }
          >
            {screen}
          </Suspense>
        </Content>
        {!studying && (
          <Footer className="app-footer">
            <span>Quiz App · {t('Learn at your own pace.')}</span>
            <a
              href="https://github.com/tuanvipandpro/quiz-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubOutlined aria-hidden="true" /> {t('View on GitHub')}
            </a>
          </Footer>
        )}
      </Layout>
      <SignInModal
        open={loginVisible}
        busy={loginBusy}
        error={loginError}
        onSignIn={login}
        onClose={() => {
          setLoginVisible(false);
          setLoginError(null);
        }}
      />
      {settingsVisible && (
        <Suspense fallback={null}>
          <SettingsModal visible onClose={() => setSettingsVisible(false)} />
        </Suspense>
      )}
    </ConfigProvider>
  );
}
