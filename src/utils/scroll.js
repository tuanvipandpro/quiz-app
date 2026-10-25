export function getScrollTarget() {
  // Embedded browsers can scroll on body instead of window.
  return document.body.scrollHeight > document.body.clientHeight ? document.body : window;
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'auto' });
  document.body.scrollTo({ top: 0, behavior: 'auto' });
}
