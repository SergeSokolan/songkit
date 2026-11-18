/* global document, localStorage */
// This same-origin script runs before the styles paint and is precached with the app.
try {
  const theme = localStorage.getItem('songkit.theme');
  if (theme === 'olive' || theme === 'dusk' || theme === 'linen') {
    document.documentElement.dataset.theme = theme;
  }
  if (localStorage.getItem('songkit.language') === 'en') document.documentElement.lang = 'en';
} catch {
  // Storage may be unavailable. The document defaults still work.
}
