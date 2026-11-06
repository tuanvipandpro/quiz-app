import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRoot from '../../src/AppRoot';

let strict = false;
try {
  strict = sessionStorage.getItem('quiz-e2e-history-strict') === '1';
} catch {
  /* Optional test setting. */
}
document.documentElement.dataset.e2eHistoryStrict = String(strict);
const Root = strict ? React.StrictMode : React.Fragment;
ReactDOM.createRoot(document.getElementById('app')).render(
  <Root>
    <AppRoot />
  </Root>
);
