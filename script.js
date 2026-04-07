(function () {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#site-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.addEventListener('click', (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (a) {
        nav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const storageKey = 'theme';
  const root = document.documentElement;
  const themeToggle = document.querySelector('.theme-toggle');
  const themeIcon = document.querySelector('.theme-icon');
  const themeLabel = document.querySelector('.theme-label');

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch {}
  }

  function setTheme(theme, persist) {
    if (theme === 'dark') {
      root.dataset.theme = 'dark';
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeLabel) themeLabel.textContent = 'Dark';
      if (themeToggle) themeToggle.setAttribute('aria-pressed', 'true');
    } else {
      root.dataset.theme = 'light';
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeLabel) themeLabel.textContent = 'Light';
      if (themeToggle) themeToggle.setAttribute('aria-pressed', 'false');
    }
    if (persist) safeSet(storageKey, theme);
  }

  function withTransition(fn) {
    root.classList.add('theme-transition');
    requestAnimationFrame(() => {
      fn();
      window.setTimeout(() => root.classList.remove('theme-transition'), 300);
    });
  }

  const stored = safeGet(storageKey);
  if (stored === 'dark') setTheme('dark', false);
  else setTheme('light', false);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      withTransition(() => setTheme(next, true));
    });
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
