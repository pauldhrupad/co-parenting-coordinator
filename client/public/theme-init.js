// Apply appearance before the first paint; blocked storage must not break startup.
(() => {
  let theme;
  try { theme = localStorage.getItem('coparent_theme'); } catch { /* Use device preference. */ }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171A19' : '#F4F1EB');
})();
